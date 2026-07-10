import {
  Prisma,
  deleteIndicatorRecordById,
  getIndicatorById,
  lockIndicatorRow,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertIndicatorExpectedUpdatedAtMatches,
  InventoryIndicatorDomainError,
} from "@builders/domain"
import { InventoryIndicatorExecutionError } from "./errors.js"
import type { DeleteIndicatorInput } from "./types.js"

export async function deleteIndicatorUseCase(
  input: DeleteIndicatorInput,
  client?: Prisma.TransactionClient,
): Promise<void> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const existing = await getIndicatorById(input.indicatorId, c)
    if (!existing) {
      throw new InventoryIndicatorExecutionError({
        code: "INVENTORY_INDICATOR_NOT_FOUND",
        message: "Inventory indicator not found",
        status: 404,
      })
    }
    if (existing.productId !== input.productId) {
      throw new InventoryIndicatorExecutionError({
        code: "INVENTORY_INDICATOR_SCOPE_MISMATCH",
        message: "Inventory indicator does not belong to this product",
        status: 404,
      })
    }

    try {
      assertIndicatorExpectedUpdatedAtMatches({
        rowUpdatedAt: existing.updatedAt,
        expected: input.expectedUpdatedAt,
      })
    } catch (error) {
      if (error instanceof InventoryIndicatorDomainError) {
        throw new InventoryIndicatorExecutionError({
          code: "INVENTORY_INDICATOR_STALE",
          message:
            "Inventory indicator was modified by someone else; refresh and try again",
          status: 409,
          payload: {
            indicatorId: existing.id,
            expected: input.expectedUpdatedAt,
            actual: existing.updatedAt,
          },
        })
      }
      throw error
    }

    await lockIndicatorRow(c, existing.id)
    await deleteIndicatorRecordById(c, { id: existing.id })
  })
}
