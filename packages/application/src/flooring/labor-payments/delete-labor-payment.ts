import { Prisma, deleteLaborPaymentRecordById, withDatabaseTransaction } from "@builders/db"
import { LABOR_PAYMENT_NOT_FOUND_MESSAGE } from "@builders/domain"
import { LaborPaymentExecutionError } from "./errors.js"

export async function deleteLaborPaymentUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteLaborPaymentRecordById(id, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new LaborPaymentExecutionError({
          code: "LABOR_PAYMENT_NOT_FOUND",
          message: LABOR_PAYMENT_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
