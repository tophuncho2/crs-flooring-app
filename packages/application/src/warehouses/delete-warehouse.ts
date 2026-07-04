import {
  Prisma,
  deleteWarehouseById,
  getWarehouseDeleteState,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildWarehouseDeleteBlockedMessage,
  isWarehouseDeleteBlocked,
} from "@builders/domain"
import { WarehouseExecutionError } from "./errors.js"

export async function deleteWarehouseUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const counts = await getWarehouseDeleteState(id, c)
    if (!counts) {
      throw new WarehouseExecutionError({
        code: "WAREHOUSE_NOT_FOUND",
        message: "Warehouse not found",
        status: 404,
      })
    }

    if (isWarehouseDeleteBlocked(counts)) {
      throw new WarehouseExecutionError({
        code: "WAREHOUSE_IN_USE",
        message: buildWarehouseDeleteBlockedMessage(counts),
        status: 409,
      })
    }

    await deleteWarehouseById(id, c)

    return { ok: true }
  })
}
