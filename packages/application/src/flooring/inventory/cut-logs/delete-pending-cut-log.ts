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

export async function deletePendingCutLogUseCase(
  input: DeletePendingCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<DeleteCutLogResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const found = await getPendingCutLogWithInventoryForMutation(c, input.cutLogId)
    if (!found) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Cut log not found",
        status: 404,
      })
    }
    const { cutLog: existing, inventory } = found

    assertCutLogScope(input.scope, {
      workOrderId: existing.workOrderId,
      inventoryId: existing.inventoryId,
    })

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

    await lockInventoryForCutLog(c, existing.inventoryId)

    await deletePendingCutLogRow(c, { id: existing.id })

    const recomputed = await recomputeAndPersistTotalCutSums(c, [existing.inventoryId])
    const result = recomputed[0]
    if (!result) {
      throw new CutLogDomainError("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK", {
        reason: "recompute returned no rows",
        inventoryId: existing.inventoryId,
      })
    }
    try {
      assertCutSumWithinStartingStock({
        totalCutSum: result.totalCutSum,
        startingStock: inventory.startingStock,
      })
    } catch (error) {
      if (
        error instanceof CutLogDomainError &&
        error.code === "CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK"
      ) {
        const unit = inventory.stockUnitAbbrev ? ` ${inventory.stockUnitAbbrev}` : ""
        throw new CutLogExecutionError({
          code: "CUT_LOG_EXCEEDS_INVENTORY",
          message: `Cut exceeds available inventory: total cuts would be ${result.totalCutSum}${unit} but only ${inventory.startingStock}${unit} is available.`,
          status: 400,
          payload: {
            inventoryId: result.inventoryId,
            totalCutSum: result.totalCutSum,
            startingStock: inventory.startingStock,
          },
        })
      }
      throw error
    }

    return {
      deletedId: existing.id,
      inventoryId: result.inventoryId,
      totalCutSum: result.totalCutSum,
    }
  })
}
