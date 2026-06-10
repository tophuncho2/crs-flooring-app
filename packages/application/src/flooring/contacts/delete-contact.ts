import { Prisma, deleteContactRecordById, withDatabaseTransaction } from "@builders/db"
import {
  CONTACT_HAS_LABOR_PAYMENTS_MESSAGE,
  CONTACT_NOT_FOUND_MESSAGE,
} from "@builders/domain"
import { ContactExecutionError } from "./errors.js"

export async function deleteContactUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteContactRecordById(id, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new ContactExecutionError({
          code: "CONTACT_NOT_FOUND",
          message: CONTACT_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new ContactExecutionError({
          code: "CONTACT_HAS_LABOR_PAYMENTS",
          message: CONTACT_HAS_LABOR_PAYMENTS_MESSAGE,
          status: 409,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
