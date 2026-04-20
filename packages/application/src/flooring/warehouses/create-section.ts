import {
  Prisma,
  createSection,
  getExistingSectionNumbers,
  getWarehouseById,
  withDatabaseTransaction,
} from "@builders/db"
import { computeNextNumber } from "@builders/domain"
import { WarehouseExecutionError } from "./errors.js"
import type { SectionResult } from "./types.js"

/**
 * Sections have no editable fields; create takes only warehouseId.
 */
export async function createSectionUseCase(
  warehouseId: string,
  client?: Prisma.TransactionClient,
): Promise<SectionResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (!(await getWarehouseById(warehouseId, c))) {
      throw new WarehouseExecutionError({
        code: "WAREHOUSE_NOT_FOUND",
        message: "Warehouse not found",
        status: 404,
      })
    }

    const existing = await getExistingSectionNumbers(warehouseId, c)
    const number = computeNextNumber(existing)

    return await createSection({ warehouseId, number }, c)
  })
}
