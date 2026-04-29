import {
  Prisma,
  applyFinalizeWorkOrderCutLogBatch,
  getInventoriesForCutLogIds,
  lockInventoriesForCutLogBatch,
  markWorkOrderItemStatus,
  recomputeAndPersistTotalCutSums,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertCutSumWithinStartingStock,
  canFinalizeCutLog,
  getCutLogFinalizabilityBlocker,
  type FinalizeWorkOrderCutLogBatchPayload,
} from "@builders/domain"
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
 *      `finalCutSequence` per inventory.
 *   5. Recompute `totalCutSum` per touched inventory and assert the
 *      `≤ startingStock` invariant.
 *   6. Mark every touched WOMI `FINALIZING → IDLE`.
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

    await applyFinalizeWorkOrderCutLogBatch(c, { cutLogIds: payload.cutLogIds })

    const recomputed = await recomputeAndPersistTotalCutSums(c, inventoryIds)
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
 * Worker processor's catch path — flips every touched WOMI to FAILED
 * in a fresh TX after the apply use case rolled back.
 */
export async function markWorkOrderItemsFailedFromFinalizeBatch(
  workOrderItemIds: string[],
  client?: Prisma.TransactionClient,
): Promise<void> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    for (const id of workOrderItemIds) {
      try {
        await markWorkOrderItemStatus(id, "FAILED", c)
      } catch {
        // Swallow: same rationale as pending-diff failure path.
      }
    }
  })
}
