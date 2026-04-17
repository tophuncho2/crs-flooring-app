import {
  Prisma,
  createSection,
  getExistingSectionNumbers,
  getWarehouseById,
  lockFlooringWarehouseRow,
  withDatabaseTransaction,
} from "@builders/db"
import { computeNextNumber } from "@builders/domain"
import { WarehouseExecutionError } from "./errors.js"
import type { SectionResult } from "./types.js"

/**
 * Sections have no editable fields; create takes only warehouseId.
 *
 * Lock ordering: lockFlooringWarehouseRow must run on the transaction
 * client (`c` is always a TransactionClient — caller-supplied or the outer
 * `tx`). Lock prevents concurrent section creates from assigning the same
 * number under the @@unique([warehouseId, number]) constraint.
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

    await lockFlooringWarehouseRow(c, warehouseId)

    const existing = await getExistingSectionNumbers(warehouseId, c)
    const number = computeNextNumber(existing)

    return await createSection({ warehouseId, number }, c)
  })
}
