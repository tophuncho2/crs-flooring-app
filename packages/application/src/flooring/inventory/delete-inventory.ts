import {
  Prisma,
  deleteInventoryRecordById,
  getInventoryDeleteState,
  lockInventoryRow,
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

    await lockInventoryRow(c, id)

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
        payload: { inventoryAdjustmentsCount: state.inventoryAdjustmentsCount },
      })
    }

    await deleteInventoryRecordById(id, c)
    return { ok: true }
  })
}
