import {
  Prisma,
  deletePendingCutLogRow,
  getPendingCutLogWithInventoryForMutation,
  lockInventoriesForCutLogBatch,
  recomputeAndPersistTotalCutSums,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertCutLogExpectedUpdatedAtMatches,
  assertCutLogLinkageSymmetry,
  assertCutLogPendingMutationAllowed,
  assertCutSumWithinStartingStock,
  assertWorkOrderItemReadyForCutLogMutation,
  CutLogDomainError,
  WorkOrderDomainError,
  type DeletePendingCutLogInput,
} from "@builders/domain"
import { WorkOrderCutLogExecutionError } from "./errors.js"

/**
 * Synchronous delete for a single pending cut log. Single TX:
 *   1. WOMI ownership + status check (status === IDLE).
 *   2. Read cut log + parent inventory in one round trip.
 *   3. Assert linkage, PENDING-only (final cuts cannot be deleted —
 *      they can only be voided), OCC.
 *   4. Linkage symmetry.
 *   5. Lock the parent inventory FOR UPDATE.
 *   6. Delete the row.
 *   7. Recompute `totalCutSum` (defense-in-depth — total can only
 *      decrease on delete) + invariant assertion.
 */
export async function deletePendingCutLogUseCase(
  input: DeletePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<{ deletedId: string; inventoryId: string; totalCutSum: string }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // 1. Read WOMI; assert ownership + IDLE.
    const womi = await c.flooringWorkOrderItem.findUnique({
      where: { id: input.workOrderItemId },
      select: { id: true, workOrderId: true, status: true },
    })
    if (!womi) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
        message: "Work order material item not found",
        status: 404,
      })
    }
    if (womi.workOrderId !== input.workOrderId) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH",
        message: "Material item does not belong to this work order",
        status: 400,
        payload: {
          providedWorkOrderId: input.workOrderId,
          actualWorkOrderId: womi.workOrderId,
        },
      })
    }
    try {
      assertWorkOrderItemReadyForCutLogMutation({ status: womi.status })
    } catch (error) {
      if (error instanceof WorkOrderDomainError) {
        throw new WorkOrderCutLogExecutionError({
          code: "WORK_ORDER_ITEM_NOT_IDLE",
          message:
            "Material item is currently busy with another cut-log operation",
          status: 409,
          payload: { status: womi.status, cause: String(error) },
        })
      }
      throw error
    }

    // 2. Read cut log + parent inventory in one round trip.
    const found = await getPendingCutLogWithInventoryForMutation(c, input.cutLogId)
    if (!found) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
        message: "Cut log not found",
        status: 404,
      })
    }
    const { cutLog: existing, inventory } = found

    // 3a. Linkage check.
    if (existing.workOrderItemId !== input.workOrderItemId) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH",
        message: "Cut log does not belong to this material item",
        status: 409,
        payload: {
          cutLogId: existing.id,
          expectedWorkOrderItemId: input.workOrderItemId,
          actualWorkOrderItemId: existing.workOrderItemId,
        },
      })
    }

    // 3b. PENDING-only (final cuts cannot be deleted).
    try {
      assertCutLogPendingMutationAllowed({
        status: existing.status,
        isFinal: existing.isFinal,
        void: existing.void,
      })
    } catch (error) {
      if (error instanceof CutLogDomainError) {
        throw new WorkOrderCutLogExecutionError({
          code: "WORK_ORDER_CUT_LOG_DELETE_NOT_ALLOWED",
          message:
            "Cannot delete a finalized or voided cut log; void it instead",
          status: 409,
          payload: {
            cutLogId: existing.id,
            status: existing.status,
            isFinal: existing.isFinal,
            void: existing.void,
          },
        })
      }
      throw error
    }

    // 3c. OCC.
    try {
      assertCutLogExpectedUpdatedAtMatches({
        rowUpdatedAt: existing.updatedAt,
        expected: input.expectedUpdatedAt,
      })
    } catch (error) {
      if (error instanceof CutLogDomainError) {
        throw new WorkOrderCutLogExecutionError({
          code: "WORK_ORDER_CUT_LOG_STALE",
          message:
            "Cut log was modified by someone else; refresh and try again",
          status: 409,
          payload: {
            cutLogId: existing.id,
            expected: input.expectedUpdatedAt,
            actual: existing.updatedAt,
          },
        })
      }
      throw error
    }

    // 4. Linkage symmetry.
    assertCutLogLinkageSymmetry({
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
    })

    // 5. Lock the parent inventory.
    await lockInventoriesForCutLogBatch(c, [existing.inventoryId])

    // 6. Delete the row.
    await deletePendingCutLogRow(c, { id: existing.id })

    // 7. Recompute + invariant (defense-in-depth — total only decreases on delete).
    const recomputed = await recomputeAndPersistTotalCutSums(c, [existing.inventoryId])
    const result = recomputed[0]
    if (!result) {
      throw new CutLogDomainError("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK", {
        reason: "recompute returned no rows",
        inventoryId: existing.inventoryId,
      })
    }
    assertCutSumWithinStartingStock({
      totalCutSum: result.totalCutSum,
      startingStock: inventory.startingStock,
    })

    return {
      deletedId: existing.id,
      inventoryId: result.inventoryId,
      totalCutSum: result.totalCutSum,
    }
  })
}
