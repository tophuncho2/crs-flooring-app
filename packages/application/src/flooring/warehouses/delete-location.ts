import {
  Prisma,
  deleteLocationById,
  getLocationDeleteState,
  withDatabaseTransaction,
} from "@builders/db"
import {
  buildLocationDeleteBlockedMessage,
  isLocationDeleteBlocked,
} from "@builders/domain"
import { WarehouseExecutionError } from "./errors.js"

export async function deleteLocationUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const counts = await getLocationDeleteState(id, c)
    if (!counts) {
      throw new WarehouseExecutionError({
        code: "LOCATION_NOT_FOUND",
        message: "Location not found",
        status: 404,
      })
    }

    if (isLocationDeleteBlocked(counts)) {
      throw new WarehouseExecutionError({
        code: "LOCATION_IN_USE",
        message: buildLocationDeleteBlockedMessage(counts),
        status: 409,
      })
    }

    await deleteLocationById(id, c)

    return { ok: true }
  })
}
