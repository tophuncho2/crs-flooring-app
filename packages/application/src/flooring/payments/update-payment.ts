import { Prisma, updatePaymentRecord, withDatabaseTransaction } from "@builders/db"
import { PAYMENT_NOT_FOUND_MESSAGE, isValidMoneyAmount } from "@builders/domain"
import { PaymentExecutionError } from "./errors.js"
import type { PaymentUseCaseResult, UpdatePaymentUseCaseInput } from "./types.js"

export async function updatePaymentUseCase(
  id: string,
  input: UpdatePaymentUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<PaymentUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("updatePaymentUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.amount !== undefined) {
      const raw = input.amount.trim()
      if (!isValidMoneyAmount(raw) || Number(raw) <= 0) {
        throw new PaymentExecutionError({
          code: "PAYMENT_VALIDATION_FAILED",
          message: "Amount must be greater than zero.",
          status: 400,
          field: "amount",
        })
      }
    }

    if (
      input.direction !== undefined &&
      input.direction !== "REVENUE" &&
      input.direction !== "EXPENSE"
    ) {
      throw new PaymentExecutionError({
        code: "PAYMENT_VALIDATION_FAILED",
        message: "Direction (revenue or expense) is required.",
        status: 400,
        field: "direction",
      })
    }

    try {
      return await updatePaymentRecord(id, { ...input, updatedBy: actorEmail }, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new PaymentExecutionError({
          code: "PAYMENT_NOT_FOUND",
          message: PAYMENT_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      // A linked entity/work-order id that points at no row trips the FK (P2003).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new PaymentExecutionError({
          code: "PAYMENT_LINK_INVALID",
          message: "Linked work order or entity could not be found.",
          status: 400,
          field: "entityId",
        })
      }
      throw error
    }
  })
}
