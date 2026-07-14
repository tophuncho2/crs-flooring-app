import { Prisma, updatePaymentRecord, withDatabaseTransaction } from "@builders/db"
import { PAYMENT_NOT_FOUND_MESSAGE, isValidMoneyAmount } from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2025, isP2003, p2003FieldName } from "../shared/prisma-errors.js"
import { PaymentExecutionError } from "./errors.js"
import type { PaymentUseCaseResult, UpdatePaymentUseCaseInput } from "./types.js"

export async function updatePaymentUseCase(
  id: string,
  input: UpdatePaymentUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<PaymentUseCaseResult> {
  assertActorEmail(actorEmail, "updatePaymentUseCase")

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
      if (isP2025(error)) {
        throw new PaymentExecutionError({
          code: "PAYMENT_NOT_FOUND",
          message: PAYMENT_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      // A linked id (entity, work order, or payment purpose) that points at no
      // row trips the FK (P2003). Attribute to the right field via the P2003 detail.
      if (isP2003(error)) {
        const isPurpose = p2003FieldName(error)?.includes("paymentpurpose") ?? false
        throw new PaymentExecutionError({
          code: "PAYMENT_LINK_INVALID",
          message: isPurpose
            ? "Linked payment purpose could not be found."
            : "Linked work order or entity could not be found.",
          status: 400,
          field: isPurpose ? "paymentPurposeId" : "entityId",
        })
      }
      throw error
    }
  })
}
