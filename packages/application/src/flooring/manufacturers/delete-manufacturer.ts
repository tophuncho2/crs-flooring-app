import { Prisma, getManufacturerDeleteState, deleteManufacturerRecordById, withDatabaseTransaction } from "@builders/db"
import { isManufacturerDeleteBlocked } from "@builders/domain"
import { ManufacturerExecutionError } from "./errors.js"

export async function deleteManufacturerUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const manufacturer = await getManufacturerDeleteState(id, c)

    if (!manufacturer) {
      throw new ManufacturerExecutionError({
        code: "MANUFACTURER_NOT_FOUND",
        message: "Manufacturer not found",
        status: 404,
      })
    }

    if (isManufacturerDeleteBlocked(manufacturer._count.products)) {
      throw new ManufacturerExecutionError({
        code: "MANUFACTURER_IN_USE",
        message: "This manufacturer has linked products and cannot be deleted",
        status: 409,
      })
    }

    await deleteManufacturerRecordById(id, c)

    return { ok: true }
  })
}
