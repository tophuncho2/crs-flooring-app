import {
  Prisma,
  deleteInventoryAgeIndicatorRecordById,
  withDatabaseTransaction,
} from "@builders/db"
import { INVENTORY_AGE_INDICATOR_NOT_FOUND_MESSAGE } from "@builders/domain"
import { isP2025 } from "../shared/prisma-errors.js"
import { InventoryAgeIndicatorExecutionError } from "./errors.js"

export async function deleteInventoryAgeIndicatorUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteInventoryAgeIndicatorRecordById(id, c)
    } catch (error) {
      if (isP2025(error)) {
        throw new InventoryAgeIndicatorExecutionError({
          code: "INVENTORY_AGE_INDICATOR_NOT_FOUND",
          message: INVENTORY_AGE_INDICATOR_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
