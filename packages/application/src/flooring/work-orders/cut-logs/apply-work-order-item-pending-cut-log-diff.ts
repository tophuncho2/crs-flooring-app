import {
  Prisma,
  applyWorkOrderItemCutLogPendingDiff,
  getInventoriesForCutLogDiff,
  lockInventoriesForCutLogBatch,
  markWorkOrderItemStatus,
  recomputeAndPersistTotalCutSums,
  withDatabaseTransaction,
  type WorkOrderCutLogPendingDraftInput,
  type WorkOrderCutLogPendingUpdateInput,
} from "@builders/db"
import {
  assertCutLogDeleteAllowed,
  assertCutSumWithinStartingStock,
  computeCutCoverage,
  type SaveWorkOrderItemPendingCutLogDiffPayload,
} from "@builders/domain"
import { logStructuredEvent } from "@builders/lib"
import { WorkOrderCutLogExecutionError } from "./errors.js"

type CoverageInfo = {
  categorySlug: string
  coveragePerUnit: string | null
}

/**
 * Derive the persisted `coverageCut` value (string `Decimal(12, 2)` or
 * null) for a given draft's `cut` against its parent inventory's
 * coverage settings. Wraps the pure domain `computeCutCoverage` and
 * formats the numeric result to the schema's precision.
 */
function deriveCoverageCutString(input: {
  cut: string
  coverage: CoverageInfo | undefined
}): string | null {
  if (input.coverage === undefined) return null
  const coverageNum =
    input.coverage.coveragePerUnit === null
      ? null
      : Number(input.coverage.coveragePerUnit)
  const cutNum = Number(input.cut)
  if (!Number.isFinite(cutNum)) return null
  const result = computeCutCoverage({
    cut: cutNum,
    coveragePerUnit: coverageNum,
    category: { slug: input.coverage.categorySlug },
  })
  return result === null ? null : result.toFixed(2)
}

/**
 * Consumer (called by the BullMQ worker processor). Locks N inventories
 * deterministically, validates and applies the diff, then recomputes
 * inventory `totalCutSum` and asserts the `≤ startingStock` invariant.
 *
 * Flow inside a single TX:
 *   1. Derive the touched inventory ids from the diff.
 *   2. `lockInventoriesForCutLogBatch` — sorted ascending FOR UPDATE.
 *   3. Read each touched inventory's `categorySlug` + `coveragePerUnit`
 *      under the lock (used to derive `coverageCut` per draft and per
 *      `cut`-changing update).
 *   4. Pre-read every cut log referenced by the diff's `modified[]` or
 *      `deleted[]` in a single query. Powers three under-the-lock
 *      validations:
 *        (a) Linkage — every existing referenced row's
 *            `workOrderItemId` must match the payload's WOMI. Closes
 *            cross-WOMI mutation via crafted payloads (a malicious
 *            client could otherwise put another WOMI's cut-log id in
 *            `modified[]` or `deleted[]`).
 *        (b) Delete-allowed — `assertCutLogDeleteAllowed` rejects any
 *            delete targeting a final / voided / queued row (those can
 *            only be voided, never deleted).
 *        (c) Coverage re-derivation — supplies the parent `inventoryId`
 *            for `cut`-changing update enrichment.
 *   5. Enrich drafts with derived `coverageCut`.
 *   6. Enrich updates whose patch includes `cut` with re-derived
 *      `coverageCut`.
 *   7. Apply the diff (creates / updates / deletes). The data layer
 *      writes `before`/`after`/`finalCutSequence`/`cost`/`freight` as
 *      null on every create — those are the finalize worker's job.
 *   8. Recompute `totalCutSum` for every touched inventory.
 *   9. Assert the `totalCutSum ≤ startingStock` invariant per inventory.
 *  10. Mark the WOMI status `SAVING_CUTS → IDLE`.
 *
 * On any throw inside the TX, the caller (worker processor) catches the
 * resulting `WorkOrderCutLogExecutionError` and marks the WOMI `FAILED`
 * in a SEPARATE transaction (so the failure marker survives the
 * rollback). The worker also classifies the error for BullMQ retry
 * semantics.
 */
export async function applyWorkOrderItemPendingCutLogDiffUseCase(
  payload: SaveWorkOrderItemPendingCutLogDiffPayload,
  client?: Prisma.TransactionClient,
): Promise<{ touchedInventoryIds: string[] }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const inventoryIds = await getInventoriesForCutLogDiff(
      {
        drafts: payload.diff.added.map((d) => ({ inventoryId: d.inventoryId })),
        updates: payload.diff.modified.map((u) => ({ id: u.id })),
        deletes: payload.diff.deleted.map((d) => ({ id: d.id })),
      },
      c,
    )

    await lockInventoriesForCutLogBatch(c, inventoryIds)

    // Read coverage data for every touched inventory under the lock.
    const coverageRows = await c.flooringInventory.findMany({
      where: { id: { in: inventoryIds } },
      select: { id: true, categorySlug: true, coveragePerUnit: true },
    })
    const coverageById = new Map<string, CoverageInfo>(
      coverageRows.map((r) => [
        r.id,
        {
          categorySlug: r.categorySlug,
          coveragePerUnit: r.coveragePerUnit === null ? null : r.coveragePerUnit.toString(),
        },
      ]),
    )

    // Pre-read every cut log referenced by `modified[]` or `deleted[]`
    // in a single batched query. The same select powers three checks:
    //   (a) WOMI linkage — every referenced row must belong to this
    //       WOMI (closes cross-WOMI mutation via crafted payloads).
    //   (b) Delete-allowed — final / voided / queued rows can only be
    //       voided, not deleted.
    //   (c) Coverage re-derivation — `cut`-changing updates need the
    //       parent `inventoryId` to look up coverage data.
    const referencedIds = Array.from(
      new Set([
        ...payload.diff.modified.map((u) => u.id),
        ...payload.diff.deleted.map((d) => d.id),
      ]),
    )
    type ReferencedRow = {
      inventoryId: string
      workOrderItemId: string | null
      status: "PENDING" | "QUEUED" | "FINAL" | "VOID"
      isFinal: boolean
      void: boolean
    }
    const referencedById = new Map<string, ReferencedRow>()
    if (referencedIds.length > 0) {
      const rows = await c.flooringCutLog.findMany({
        where: { id: { in: referencedIds } },
        select: {
          id: true,
          inventoryId: true,
          workOrderItemId: true,
          status: true,
          isFinal: true,
          void: true,
        },
      })
      for (const r of rows) {
        referencedById.set(r.id, {
          inventoryId: r.inventoryId,
          workOrderItemId: r.workOrderItemId,
          status: r.status,
          isFinal: r.isFinal,
          void: r.void,
        })
      }
    }

    // (a) Linkage — every existing referenced row must belong to this
    //     WOMI. Missing rows are not flagged here: deletes are
    //     idempotent on missing ids, and updates against missing ids
    //     surface a clear error from the data layer's `update`.
    for (const id of referencedIds) {
      const row = referencedById.get(id)
      if (row === undefined) continue
      if (row.workOrderItemId !== payload.workOrderItemId) {
        throw new WorkOrderCutLogExecutionError({
          code: "WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH",
          message: "Cut log does not belong to this material item",
          status: 409,
          payload: {
            cutLogId: id,
            expectedWorkOrderItemId: payload.workOrderItemId,
            actualWorkOrderItemId: row.workOrderItemId,
          },
        })
      }
    }

    // (b) Delete-allowed — only PENDING rows are deletable.
    for (const del of payload.diff.deleted) {
      const row = referencedById.get(del.id)
      if (row === undefined) continue
      try {
        assertCutLogDeleteAllowed(row)
      } catch {
        throw new WorkOrderCutLogExecutionError({
          code: "WORK_ORDER_CUT_LOG_DELETE_NOT_ALLOWED",
          message: "Cannot delete a finalized or voided cut log; void it instead",
          status: 409,
          payload: {
            cutLogId: del.id,
            status: row.status,
            isFinal: row.isFinal,
            void: row.void,
          },
        })
      }
    }

    // Enrich drafts with derived coverageCut.
    const enrichedDrafts: WorkOrderCutLogPendingDraftInput[] = payload.diff.added.map(
      (draft) => ({
        ...draft,
        coverageCut: deriveCoverageCutString({
          cut: draft.cut,
          coverage: coverageById.get(draft.inventoryId),
        }),
      }),
    )

    // (c) Enrich updates whose patch includes a new `cut` value with a
    //     re-derived `coverageCut`. Parent `inventoryId` comes from
    //     `referencedById` (same pre-read).
    const enrichedUpdates: WorkOrderCutLogPendingUpdateInput[] = payload.diff.modified.map(
      (update) => {
        if (update.patch.cut === undefined) return update
        const row = referencedById.get(update.id)
        if (row === undefined) return update
        const coverageCut = deriveCoverageCutString({
          cut: update.patch.cut,
          coverage: coverageById.get(row.inventoryId),
        })
        return {
          ...update,
          patch: { ...update.patch, coverageCut },
        }
      },
    )

    await applyWorkOrderItemCutLogPendingDiff(c, {
      workOrderId: payload.workOrderId,
      workOrderItemId: payload.workOrderItemId,
      drafts: enrichedDrafts,
      updates: enrichedUpdates,
      deletes: payload.diff.deleted,
    })

    const recomputed = await recomputeAndPersistTotalCutSums(c, inventoryIds)

    // Assert the invariant per touched inventory. We need each inventory's
    // startingStock to compare against the new totalCutSum.
    const startingStocks = await c.flooringInventory.findMany({
      where: { id: { in: inventoryIds } },
      select: { id: true, startingStock: true },
    })
    const stockById = new Map(startingStocks.map((s) => [s.id, s.startingStock.toString()]))
    for (const row of recomputed) {
      const startingStock = stockById.get(row.inventoryId)
      if (startingStock === undefined) continue
      assertCutSumWithinStartingStock({
        totalCutSum: row.totalCutSum,
        startingStock,
      })
    }

    await markWorkOrderItemStatus(payload.workOrderItemId, "IDLE", c)

    return { touchedInventoryIds: inventoryIds }
  })
}

/**
 * Callable by the worker processor's catch path to flip the WOMI to
 * FAILED in a fresh TX after the apply use case rolled back. Kept here
 * (instead of inside the apply function) so the FAILED state survives
 * the rollback that triggered it.
 *
 * If the FAILED-marker write itself throws, the error is logged at
 * `error` level (so stuck-state WOMIs are observable) but swallowed —
 * the worker processor's caller already has the original error to
 * surface for BullMQ classification, and re-throwing here would mask it.
 */
export async function markWorkOrderItemFailedFromCutLogDiff(
  workOrderItemId: string,
  client?: Prisma.TransactionClient,
): Promise<void> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    try {
      await markWorkOrderItemStatus(workOrderItemId, "FAILED", c)
    } catch (err) {
      logStructuredEvent({
        level: "error",
        service: "builders-application",
        environment: process.env.NODE_ENV ?? "unknown",
        message:
          "Failed to mark WOMI FAILED after worker error — WOMI may be stuck in SAVING_CUTS",
        action: "work_orders.cut_logs.mark_failed_failed",
        details: { workOrderItemId },
        error: err,
      })
    }
  })
}

// Re-export for the worker processor's instanceof check.
export { WorkOrderCutLogExecutionError }
