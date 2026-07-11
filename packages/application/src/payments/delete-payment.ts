import { Prisma, deletePaymentRecordById, withDatabaseTransaction } from "@builders/db"
import { PAYMENT_NOT_FOUND_MESSAGE } from "@builders/domain"
import { isP2025 } from "../shared/prisma-errors.js"
import { PaymentExecutionError } from "./errors.js"

export async function deletePaymentUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deletePaymentRecordById(id, c)
    } catch (error) {
      if (isP2025(error)) {
        throw new PaymentExecutionError({
          code: "PAYMENT_NOT_FOUND",
          message: PAYMENT_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
