import { Prisma, deletePaymentPurposeRecordById, withDatabaseTransaction } from "@builders/db"
import { PAYMENT_PURPOSE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { isP2025 } from "../shared/prisma-errors.js"
import { PaymentPurposeExecutionError } from "./errors.js"

export async function deletePaymentPurposeUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deletePaymentPurposeRecordById(id, c)
    } catch (error) {
      if (isP2025(error)) {
        throw new PaymentPurposeExecutionError({
          code: "PAYMENT_PURPOSE_NOT_FOUND",
          message: PAYMENT_PURPOSE_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
