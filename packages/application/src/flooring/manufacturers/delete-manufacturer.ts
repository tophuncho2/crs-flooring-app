import { Prisma, deleteManufacturerRecordById, withDatabaseTransaction } from "@builders/db"
import { ManufacturerExecutionError } from "./errors.js"

export async function deleteManufacturerUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteManufacturerRecordById(id, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ManufacturerExecutionError({
          code: "MANUFACTURER_NOT_FOUND",
          message: "Manufacturer not found",
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
