import {
  Prisma,
  applyFinalizeWorkOrderCutLogBatch,
  getInventoriesForCutLogIds,
  lockInventoriesForCutLogBatch,
  markWorkOrderItemStatus,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertBeforeCutAfterInvariant,
  canFinalizeCutLog,
  getCutLogFinalizabilityBlocker,
  type FinalizeWorkOrderCutLogBatchPayload,
} from "@builders/domain"
import { logStructuredEvent } from "@builders/lib"
import { WorkOrderCutLogExecutionError } from "./errors.js"

/**
 * Consumer (called by the BullMQ worker processor) for the finalize-batch
 * flow.
 *
 * Inside a single TX:
 *   1. Derive the touched inventory ids from the referenced cut log rows.
 *   2. `lockInventoriesForCutLogBatch` — sorted ascending FOR UPDATE.
 *   3. Re-validate every row's `canFinalizeCutLog` predicate (defensive
 *      against drift between producer time and consumer time).
 *   4. Apply finalize: flip status PENDING → FINAL, stamp
 *      `before` / `after` / `finalCutSequence` per inventory via the
 *      data layer's chronological walk (sorted by createdAt asc within
 *      each inventory; running balance starts at
 *      `startingStock − sum(existing FINAL non-void cuts)`; sequence
 *      starts at `max(finalCutSequence over isFinal=true rows) + 1`,
 *      including voided-after-final rows so their slot is never reused).
 *   5. Defensively assert `before − cut === after` per stamped row via
 *      the domain invariant. Pure check; throws on arithmetic drift.
 *   6. Mark every touched WOMI `FINALIZING → IDLE`.
 *
 * `recomputeAndPersistTotalCutSums` and `assertCutSumWithinStartingStock`
 * are intentionally NOT called here — cut values don't change at
 * finalize time, so `totalCutSum` is identical pre/post and the
 * invariant is automatically preserved. Both calls are no-ops at
 * finalize and have been dropped to save a query and avoid misleading
 * "we re-checked the invariant" semantics.
 *
 * On any throw, the worker processor flips every touched WOMI to
 * FAILED in a fresh TX after the rollback (parallels the pending-diff
 * worker's failure path).
 */
export async function applyFinalizeWorkOrderCutLogBatchUseCase(
  payload: FinalizeWorkOrderCutLogBatchPayload,
  client?: Prisma.TransactionClient,
): Promise<{ touchedInventoryIds: string[]; touchedWorkOrderItemIds: string[] }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const inventoryIds = await getInventoriesForCutLogIds(payload.cutLogIds, c)
    await lockInventoriesForCutLogBatch(c, inventoryIds)

    // Defensive revalidation. Read each row's current state under the
    // lock and re-run the same finalizability checks the producer ran;
    // any drift since outbox enqueue (e.g., a void landed in between)
    // surfaces here.
    const rows = await c.flooringCutLog.findMany({
      where: { id: { in: payload.cutLogIds } },
      select: {
        id: true,
        cutLogNumber: true,
        workOrderId: true,
        workOrderItemId: true,
        status: true,
        isFinal: true,
        void: true,
        cut: true,
        before: true,
        after: true,
      },
    })

    if (rows.length !== payload.cutLogIds.length) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
        message: "One or more selected cut logs disappeared before finalize ran",
        status: 409,
        payload: {
          requestedCount: payload.cutLogIds.length,
          foundCount: rows.length,
        },
      })
    }

    const touchedWorkOrderItemIds = new Set<string>()
    for (const row of rows) {
      if (row.workOrderId !== payload.workOrderId || row.workOrderItemId === null) {
        throw new WorkOrderCutLogExecutionError({
          code: "WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH",
          message: "Cut log linkage drifted before finalize ran",
          status: 409,
          payload: { cutLogId: row.id },
        })
      }
      const predicateRow = {
        status: row.status,
        cut: row.cut.toString(),
        isFinal: row.isFinal,
        void: row.void,
      }
      const blocker = getCutLogFinalizabilityBlocker(predicateRow)
      if (blocker !== null || !canFinalizeCutLog(predicateRow)) {
        throw new WorkOrderCutLogExecutionError({
          code: "WORK_ORDER_CUT_LOG_FINALIZE_BLOCKED",
          message: "Cut log can no longer be finalized",
          status: 409,
          payload: { cutLogId: row.id, reason: blocker ?? "ineligible" },
        })
      }
      touchedWorkOrderItemIds.add(row.workOrderItemId)
    }

    const { stampedRows } = await applyFinalizeWorkOrderCutLogBatch(c, {
      cutLogIds: payload.cutLogIds,
    })

    // Defensively re-assert the arithmetic invariant on each row the
    // data layer just stamped. Pure check (no I/O). Catches drift
    // between the running-balance walk and the persisted values.
    for (const row of stampedRows) {
      assertBeforeCutAfterInvariant({
        before: row.before,
        cut: row.cut,
        after: row.after,
      })
    }

    const touchedWomiArray = Array.from(touchedWorkOrderItemIds)
    for (const womiId of touchedWomiArray) {
      await markWorkOrderItemStatus(womiId, "IDLE", c)
    }

    return {
      touchedInventoryIds: inventoryIds,
      touchedWorkOrderItemIds: touchedWomiArray,
    }
  })
}

/**
 * Worker processor's catch path — resolves the WOMIs touched by the
 * finalize batch (from the cut-log IDs in the payload) and flips every
 * one to FAILED in a fresh TX after the apply use case rolled back.
 *
 * Takes cut-log IDs (not WOMI IDs) because that's what the worker has
 * available from the payload at catch time. Internally derives the
 * unique non-null `workOrderItemId` set, then writes each.
 *
 * If a per-WOMI FAILED-marker write itself throws, the error is logged
 * at `error` level (so stuck-state WOMIs are observable) and swallowed
 * — the worker processor's caller already has the original error to
 * surface for BullMQ classification, and re-throwing here would mask it
 * and short-circuit the loop over remaining WOMIs.
 */
export async function markWorkOrderItemsFailedFromFinalizeBatch(
  cutLogIds: string[],
  client?: Prisma.TransactionClient,
): Promise<void> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    const rows = await c.flooringCutLog.findMany({
      where: { id: { in: cutLogIds } },
      select: { workOrderItemId: true },
    })
    const womiIds = Array.from(
      new Set(
        rows
          .map((r) => r.workOrderItemId)
          .filter((v): v is string => v !== null),
      ),
    )
    for (const id of womiIds) {
      try {
        await markWorkOrderItemStatus(id, "FAILED", c)
      } catch (err) {
        logStructuredEvent({
          level: "error",
          service: "builders-application",
          environment: process.env.NODE_ENV ?? "unknown",
          message:
            "Failed to mark WOMI FAILED after finalize-batch worker error — WOMI may be stuck in FINALIZING",
          action: "work_orders.cut_logs.finalize.mark_failed_failed",
          details: { workOrderItemId: id },
          error: err,
        })
      }
    }
  })
}
