import {
  Prisma,
  deletePendingCutLogRow,
  getPendingCutLogWithInventoryForMutation,
  lockInventoryForCutLog,
  recomputeAndPersistTotalCutSums,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertCutLogExpectedUpdatedAtMatches,
  assertCutLogPendingMutationAllowed,
  assertCutSumWithinStartingStock,
  CutLogDomainError,
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"
import { assertCutLogScope } from "./scope.js"
import type { DeleteCutLogResult, DeletePendingCutLogInput } from "./types.js"

/**
 * Synchronous delete for a single pending cut log. Callable from both
 * the WO and inventory side panels via the `scope` discriminator.
 * Single TX:
 *   1. Read cut log + parent inventory in one round trip.
 *   2. Scope assertion (cut log belongs to the scope passed by the route).
 *   3. PENDING-only gate (final cuts cannot be deleted — they can only
 *      be voided).
 *   4. OCC against `expectedUpdatedAt`.
 *   5. Lock the parent inventory FOR UPDATE.
 *   6. Delete the row.
 *   7. Recompute `totalCutSum` (defense-in-depth — total only decreases
 *      on delete) + invariant assertion.
 *
 * WOMI status is not consulted — the inventory row lock is the sole
 * concurrency mechanism.
 */
export async function deletePendingCutLogUseCase(
  input: DeletePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<DeleteCutLogResult> {
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

    // 3. PENDING-only (final cuts cannot be deleted).
    try {
      assertCutLogPendingMutationAllowed({
        status: existing.status,
        isFinal: existing.isFinal,
        void: existing.void,
      })
    } catch (error) {
      if (error instanceof CutLogDomainError) {
        throw new CutLogExecutionError({
          code: "CUT_LOG_DELETE_NOT_ALLOWED",
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

    // 4. OCC.
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

    // 5. Lock the parent inventory.
    await lockInventoryForCutLog(c, existing.inventoryId)

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
