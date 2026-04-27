import {
  Prisma,
  finalizeCutLogBatch,
  getInventoryParentContextForCutLogs,
  listCutLogsByInventoryId,
  listCutLogsForFinalizeBatch,
  withDatabaseTransaction,
} from "@builders/db"
import {
  computeTotalCutSum,
  type FinalizeCutLogBatchPayload,
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"
import type { FinalizeCutLogsResult } from "./types.js"

/**
 * Worker-side consumer for `flooring.cut-log.finalize`.
 *
 * What this does:
 *  1. Locks the parent inventory FOR UPDATE.
 *  2. Re-fetches the requested rows + defensively re-runs
 *     `validateCutLogFinalizeBatch` (catches drift since the producer ran).
 *  3. Computes `priorConsumedFromExistingFinalCuts` from the inventory's
 *     existing finalized rows (sum of `cut` over `isFinal=true && void=false`,
 *     excluding the rows in this batch since they're not finalized yet).
 *  4. Reads parent context for `startingStock`.
 *  5. Calls `finalizeCutLogBatch` (data primitive loops `nextFinalCutSequence`
 *     + `computeBeforeAfterForFinalize` per row in `cutLogNumber` order,
 *     stamps `before`/`after`/`finalCutSequence`/`status=FINAL`/`isFinal=true`).
 *
 * `totalCutSum` is unchanged by finalize (cuts were already counted as
 * non-void), so we don't call `updateInventoryTotalCutSum`.
 */
export async function finalizeCutLogsUseCase(
  payload: FinalizeCutLogBatchPayload,
  client?: Prisma.TransactionClient,
): Promise<FinalizeCutLogsResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await c.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ${payload.inventoryId} FOR UPDATE`,
    )

    const parent = await getInventoryParentContextForCutLogs(c, payload.inventoryId)
    if (!parent) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_PARENT_NOT_FOUND",
        message: "Inventory not found.",
        status: 404,
      })
    }

    const requestedRows = await listCutLogsForFinalizeBatch(c, {
      inventoryId: payload.inventoryId,
      cutLogIds: payload.cutLogIds,
    })

    if (requestedRows.length !== payload.cutLogIds.length) {
      const loadedIds = new Set(requestedRows.map((row) => row.id))
      const missingIds = payload.cutLogIds.filter((id) => !loadedIds.has(id))
      throw new CutLogExecutionError({
        code: "CUT_LOG_PRECONDITION_FAILED",
        message:
          "Cut logs changed state before finalize could complete. Batch is no longer applicable.",
        status: 409,
        payload: {
          expectedCount: payload.cutLogIds.length,
          actualCount: requestedRows.length,
          missingIds,
        },
      })
    }

    // Drift check: every row must still be in `QUEUED` state (the producer
    // flipped them) and not already FINAL or void. We do NOT re-run
    // `validateCutLogFinalizeBatch` here — that validator's
    // `getCutLogFinalizabilityBlocker` rejects QUEUED rows because it's
    // shaped for the producer's pre-mark check (where rows are still
    // PENDING). Inlining the worker-side check here mirrors staged-inv's
    // count-mismatch + status-filter pattern in
    // `materializeImportedStagedRowsUseCase`.
    const drifted = requestedRows.filter(
      (row) => row.status !== "QUEUED" || row.isFinal || row.void,
    )
    if (drifted.length > 0) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_PRECONDITION_FAILED",
        message:
          "Cut logs drifted out of QUEUED state before finalize could apply. Re-mark and try again.",
        status: 409,
        payload: { driftedRowIds: drifted.map((r) => r.id) },
      })
    }

    // Compute `priorConsumedFromExistingFinalCuts`. Existing finalized
    // (non-void) cuts are the running-balance baseline. Sweep-3's
    // `finalizeCutLogBatch` will fold the in-batch cuts on top during
    // its loop.
    const allRows = await listCutLogsByInventoryId(payload.inventoryId, c)
    const priorConsumedFromExistingFinalCuts = computeTotalCutSum(
      allRows
        .filter((row) => row.isFinal && !row.void)
        .map((row) => ({ cut: row.cut, void: row.void })),
    )

    const result = await finalizeCutLogBatch(c, {
      inventoryId: payload.inventoryId,
      cutLogIds: payload.cutLogIds,
      priorConsumedFromExistingFinalCuts,
      startingStock: parent.startingStock,
    })

    return {
      finalizedRowIds: result.finalizedRowIds,
      finalCutSequenceByRowId: result.finalCutSequenceByRowId,
    }
  })
}
