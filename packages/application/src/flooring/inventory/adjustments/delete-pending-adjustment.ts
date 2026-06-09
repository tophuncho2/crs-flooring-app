import {
  Prisma,
  deletePendingAdjustmentRow,
  getPendingAdjustmentWithInventoryForMutation,
  lockInventoryForAdjustment,
  recomputeAndPersistNetDeducted,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertAdjustmentExpectedUpdatedAtMatches,
  assertNetDeductedWithinStartingStock,
  InventoryAdjustmentDomainError,
} from "@builders/domain"
import { InventoryAdjustmentExecutionError } from "./errors.js"
import { assertAdjustmentScope } from "./scope.js"
import type {
  DeleteAdjustmentResult,
  DeletePendingAdjustmentInput,
} from "./types.js"

export async function deletePendingAdjustmentUseCase(
  input: DeletePendingAdjustmentInput,
  client?: Prisma.TransactionClient,
): Promise<DeleteAdjustmentResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const found = await getPendingAdjustmentWithInventoryForMutation(c, input.adjustmentId)
    if (!found) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        message: "Inventory adjustment not found",
        status: 404,
      })
    }
    const { adjustment: existing, inventory } = found

    assertAdjustmentScope(input.scope, {
      workOrderId: existing.workOrderId,
      inventoryId: existing.inventoryId,
    })

    // Any adjustment is freely deletable now — deleting re-flows the chain via
    // the recompute below. Only the optimistic-concurrency check still gates.
    try {
      assertAdjustmentExpectedUpdatedAtMatches({
        rowUpdatedAt: existing.updatedAt,
        expected: input.expectedUpdatedAt,
      })
    } catch (error) {
      if (error instanceof InventoryAdjustmentDomainError) {
        throw new InventoryAdjustmentExecutionError({
          code: "INVENTORY_ADJUSTMENT_STALE",
          message:
            "Inventory adjustment was modified by someone else; refresh and try again",
          status: 409,
          payload: {
            adjustmentId: existing.id,
            expected: input.expectedUpdatedAt,
            actual: existing.updatedAt,
          },
        })
      }
      throw error
    }

    await lockInventoryForAdjustment(c, existing.inventoryId)

    await deletePendingAdjustmentRow(c, { id: existing.id })

    const recomputed = await recomputeAndPersistNetDeducted(c, [existing.inventoryId])
    const result = recomputed[0]
    if (!result) {
      throw new InventoryAdjustmentDomainError(
        "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK",
        {
          reason: "recompute returned no rows",
          inventoryId: existing.inventoryId,
        },
      )
    }
    try {
      assertNetDeductedWithinStartingStock({
        netDeducted: result.netDeducted,
        startingStock: inventory.startingStock,
      })
    } catch (error) {
      if (
        error instanceof InventoryAdjustmentDomainError &&
        error.code === "INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK"
      ) {
        const unit = inventory.stockUnitAbbrev ? ` ${inventory.stockUnitAbbrev}` : ""
        throw new InventoryAdjustmentExecutionError({
          code: "INVENTORY_ADJUSTMENT_EXCEEDS_INVENTORY",
          message: `Adjustment exceeds available inventory: net deducted would be ${result.netDeducted}${unit} but only ${inventory.startingStock}${unit} is available.`,
          status: 400,
          payload: {
            inventoryId: result.inventoryId,
            netDeducted: result.netDeducted,
            startingStock: inventory.startingStock,
          },
        })
      }
      throw error
    }

    return {
      deletedId: existing.id,
      inventoryId: result.inventoryId,
      netDeducted: result.netDeducted,
    }
  })
}
