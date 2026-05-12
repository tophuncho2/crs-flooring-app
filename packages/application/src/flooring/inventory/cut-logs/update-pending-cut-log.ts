import {
  Prisma,
  getPendingCutLogWithInventoryForMutation,
  lockInventoryForCutLog,
  recomputeAndPersistTotalCutSums,
  updatePendingCutLogRow,
  withDatabaseTransaction,
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
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"
import { assertCutLogScope } from "./scope.js"
import type {
  CutLogMutationResult,
  UpdatePendingCutLogInput,
} from "./types.js"

/**
 * Synchronous update for a single pending cut log. Callable from both
 * the WO and inventory side panels via the `scope` discriminator.
 * Single TX:
 *   1. Read cut log + parent inventory in one round trip.
 *   2. Scope assertion (cut log belongs to the scope passed by the route).
 *   3. Pending-status gate (final / void rows reject here).
 *   4. OCC against `expectedUpdatedAt`.
 *   5. If `patch.link` is present: assert symmetry + WOMI ownership of
 *      the re-link target.
 *   6. Per-row form validation against the merged post-patch state.
 *   7. Lock the parent inventory FOR UPDATE.
 *   8. Build the row patch (re-derive `coverageCut` only when `cut`
 *      changed; always re-snap `location` from the parent inventory —
 *      denormalized-mirror semantics).
 *   9. Apply the patch.
 *  10. Recompute `totalCutSum` + invariant.
 *
 * WOMI status is not consulted — the inventory row lock is the sole
 * concurrency mechanism.
 */
export async function updatePendingCutLogUseCase(
  input: UpdatePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<CutLogMutationResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // 1. Read cut log + parent inventory in one round trip.
    const found = await getPendingCutLogWithInventoryForMutation(c, input.cutLogId)
    if (!found) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Cut log not found",
        status: 404,
      })
    }
    const { cutLog: existing, inventory } = found

    // 2. Scope assertion.
    assertCutLogScope(input.scope, {
      workOrderId: existing.workOrderId,
      inventoryId: existing.inventoryId,
    })

    // 3. Pending-status check (final/void cuts can't be edited via this path).
    try {
      assertCutLogPendingMutationAllowed({
        status: existing.status,
        isFinal: existing.isFinal,
        void: existing.void,
      })
    } catch (error) {
      if (error instanceof CutLogDomainError) {
        throw new CutLogExecutionError({
          code: "CUT_LOG_NOT_PENDING",
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

    // 4. Optimistic concurrency check.
    try {
      assertCutLogExpectedUpdatedAtMatches({
        rowUpdatedAt: existing.updatedAt,
        expected: input.expectedUpdatedAt,
      })
    } catch (error) {
      if (error instanceof CutLogDomainError) {
        throw new CutLogExecutionError({
          code: "CUT_LOG_STALE",
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

    // 5. Link patch — symmetry + re-link target validity.
    if (input.patch.link !== undefined) {
      assertCutLogLinkageSymmetry(input.patch.link)
      if (input.patch.link.workOrderId !== null) {
        const womi = await c.flooringWorkOrderItem.findUnique({
          where: { id: input.patch.link.workOrderItemId! },
          select: { id: true, workOrderId: true },
        })
        if (!womi) {
          throw new CutLogExecutionError({
            code: "CUT_LOG_NOT_FOUND",
            message: "Re-link target work-order material item not found",
            status: 404,
            payload: { workOrderItemId: input.patch.link.workOrderItemId },
          })
        }
        if (womi.workOrderId !== input.patch.link.workOrderId) {
          throw new CutLogExecutionError({
            code: "CUT_LOG_SCOPE_MISMATCH",
            message:
              "Re-link target material item does not belong to the provided work order",
            status: 400,
            payload: {
              providedWorkOrderId: input.patch.link.workOrderId,
              actualWorkOrderId: womi.workOrderId,
            },
          })
        }
      }
    }

    // 6. Per-row form validation against the merged post-patch state.
    const mergedCut = input.patch.cut !== undefined ? input.patch.cut : existing.cut
    const mergedIsWaste =
      input.patch.isWaste !== undefined ? input.patch.isWaste : existing.isWaste
    const mergedNotes = input.patch.notes !== undefined ? input.patch.notes : existing.notes
    const formIssues = validateCutLogPendingForm({
      cut: mergedCut,
      isWaste: mergedIsWaste,
      notes: mergedNotes,
    })
    if (formIssues.length > 0) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_VALIDATION_FAILED",
        message: describeCutLogPendingFormIssues(formIssues),
        status: 400,
        payload: { issues: formIssues },
      })
    }

    // 7. Lock the parent inventory.
    await lockInventoryForCutLog(c, existing.inventoryId)

    // 8. Build the row patch.
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
    if (input.patch.link !== undefined) {
      patch.workOrderId = input.patch.link.workOrderId
      patch.workOrderItemId = input.patch.link.workOrderItemId
    }
    // `location` is a denormalized mirror — always re-snap from the
    // parent inventory on update, regardless of which fields are in the
    // user-facing patch.
    patch.location = inventory.location

    // 9. Apply the patch.
    const cutLog = await updatePendingCutLogRow(c, { id: existing.id, patch })

    // 10. Recompute + invariant.
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
