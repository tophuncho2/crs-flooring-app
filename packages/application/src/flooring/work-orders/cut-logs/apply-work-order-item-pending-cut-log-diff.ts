import {
  Prisma,
  applyWorkOrderItemCutLogPendingDiff,
  getInventoriesForCutLogDiff,
  lockInventoriesForCutLogBatch,
  markWorkOrderItemStatus,
  recomputeAndPersistTotalCutSums,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertCutSumWithinStartingStock,
  type SaveWorkOrderItemPendingCutLogDiffPayload,
} from "@builders/domain"
import { WorkOrderCutLogExecutionError } from "./errors.js"

/**
 * Consumer (called by the BullMQ worker processor). Mirrors the
 * inventory-side `applyCutLogPendingDiffUseCase` shape but locks N
 * inventories deterministically instead of one.
 *
 * Flow inside a single TX:
 *   1. Derive the touched inventory ids from the diff (drafts'
 *      inventoryId + parent inventory of every existing row referenced
 *      by an update or delete).
 *   2. `lockInventoriesForCutLogBatch` — sorted ascending FOR UPDATE.
 *   3. Apply the diff (creates / updates / deletes), stamping both
 *      linkage columns on every draft.
 *   4. Recompute `totalCutSum` for every touched inventory.
 *   5. Assert the `totalCutSum ≤ startingStock` invariant per inventory.
 *      Any violation throws and rolls the TX back.
 *   6. Mark the WOMI status `SAVING_CUTS → IDLE`.
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

    await applyWorkOrderItemCutLogPendingDiff(c, {
      workOrderId: payload.workOrderId,
      workOrderItemId: payload.workOrderItemId,
      drafts: payload.diff.added,
      updates: payload.diff.modified,
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
 */
export async function markWorkOrderItemFailedFromCutLogDiff(
  workOrderItemId: string,
  client?: Prisma.TransactionClient,
): Promise<void> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    try {
      await markWorkOrderItemStatus(workOrderItemId, "FAILED", c)
    } catch {
      // Swallow: the worker already has the original error to surface.
      // Failing to mark FAILED is non-fatal here — the next user retry
      // will overwrite the status via the producer path.
    }
  })
}

// Re-export for the worker processor's instanceof check.
export { WorkOrderCutLogExecutionError }
