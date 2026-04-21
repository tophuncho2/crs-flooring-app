import {
  Prisma,
  deleteInventoryById,
  getInventoryDeleteState,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildInventoryDeleteBlockedMessage,
  isInventoryDeleteBlocked,
} from "@builders/domain"
import { InventoryExecutionError } from "./errors.js"

export async function deleteInventoryUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const state = await getInventoryDeleteState(id, c)
    if (!state) {
      throw new InventoryExecutionError({
        code: "INVENTORY_NOT_FOUND",
        message: "Inventory row not found.",
        status: 404,
      })
    }

    if (isInventoryDeleteBlocked(state)) {
      throw new InventoryExecutionError({
        code: "INVENTORY_IN_USE",
        message: buildInventoryDeleteBlockedMessage(state),
        status: 409,
        payload: { cutLogsCount: state.cutLogsCount },
      })
    }

    await deleteInventoryById(id, c)
    return { ok: true }
  })
}
