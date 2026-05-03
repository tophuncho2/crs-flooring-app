import {
  Prisma,
  getPendingCutLogWithInventoryForMutation,
  lockInventoryForCutLog,
  recomputeAndPersistTotalCutSums,
  updatePendingCutLogRow,
  withDatabaseTransaction,
  type CutLogRecord,
  type UpdatePendingCutLogRowPatch,
} from "@builders/db"
import {
  assertCutLogExpectedUpdatedAtMatches,
  assertCutLogLinkageSymmetry,
  assertCutLogPendingMutationAllowed,
  assertCutSumWithinStartingStock,
  CutLogDomainError,
  deriveCutLogCoverageCutString,
  describeCutLogPendingFormIssues,
  validateCutLogPendingForm,
  type UpdatePendingCutLogInput,
} from "@builders/domain"
import { WorkOrderCutLogExecutionError } from "./errors.js"

/**
 * Synchronous update for a single pending cut log. Single TX:
 *   1. WOMI ownership check (cut log links to the right WO).
 *   2. Read cut log + parent inventory in one round trip.
 *   3. Assert linkage (cut log belongs to this WOMI),
 *      pending-status (delegates to assertCutLogDeleteAllowed —
 *      finals can't be edited via this path), OCC `expectedUpdatedAt`.
 *   4. Linkage symmetry.
 *   5. Per-row form validation against the merged post-patch state.
 *   6. Lock the parent inventory FOR UPDATE.
 *   7. Re-derive `coverageCut` only when `cut` changed.
 *   8. Apply the patch (never writes immutable fields).
 *   9. Recompute `totalCutSum` + invariant.
 *
 * WOMI status is not consulted — inventory row lock is the sole
 * concurrency mechanism.
 */
export async function updatePendingCutLogUseCase(
  input: UpdatePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<{ cutLog: CutLogRecord; inventoryId: string; totalCutSum: string }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // 1. Read WOMI; assert ownership.
    const womi = await c.flooringWorkOrderItem.findUnique({
      where: { id: input.workOrderItemId },
      select: { id: true, workOrderId: true },
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

    // 3a. Linkage check — row belongs to this WOMI.
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

    // 3b. Pending-status check (final cuts can't be edited via this path).
    try {
      assertCutLogPendingMutationAllowed({
        status: existing.status,
        isFinal: existing.isFinal,
        void: existing.void,
      })
    } catch (error) {
      if (error instanceof CutLogDomainError) {
        throw new WorkOrderCutLogExecutionError({
          code: "WORK_ORDER_CUT_LOG_NOT_PENDING",
          message:
            "Cut log cannot be edited; it has been finalized or voided",
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

    // 3c. Optimistic concurrency check.
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

    // 5. Per-row form validation against the merged post-patch state.
    const mergedCut = input.patch.cut !== undefined ? input.patch.cut : existing.cut
    const mergedIsWaste =
      input.patch.isWaste !== undefined ? input.patch.isWaste : existing.isWaste
    const mergedNotes = input.patch.notes !== undefined ? input.patch.notes : existing.notes
    const formIssues = validateCutLogPendingForm({
      cut: mergedCut,
      cost: null,
      freight: null,
      isWaste: mergedIsWaste,
      notes: mergedNotes,
    })
    if (formIssues.length > 0) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_VALIDATION_FAILED",
        message: describeCutLogPendingFormIssues(formIssues),
        status: 400,
        payload: { issues: formIssues },
      })
    }

    // 6. Lock the parent inventory.
    await lockInventoryForCutLog(c, existing.inventoryId)

    // 7. Re-derive coverageCut only if cut changed.
    const patch: UpdatePendingCutLogRowPatch = {}
    if (input.patch.cut !== undefined) {
      patch.cut = input.patch.cut
      patch.coverageCut = deriveCutLogCoverageCutString({
        cut: input.patch.cut,
        coveragePerUnit: inventory.coveragePerUnit,
        categorySlug: inventory.categorySlug,
      })
    }
    if (input.patch.isWaste !== undefined) patch.isWaste = input.patch.isWaste
    if (input.patch.notes !== undefined) patch.notes = input.patch.notes

    // 8. Apply the patch.
    const cutLog = await updatePendingCutLogRow(c, { id: existing.id, patch })

    // 9. Recompute + invariant.
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
      cutLog,
      inventoryId: result.inventoryId,
      totalCutSum: result.totalCutSum,
    }
  })
}
