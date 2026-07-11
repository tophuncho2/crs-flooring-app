import { Prisma, updatePaymentPurposeRecord, withDatabaseTransaction } from "@builders/db"
import {
  PAYMENT_PURPOSE_NAME_CONFLICT_MESSAGE,
  PAYMENT_PURPOSE_NAME_REQUIRED_MESSAGE,
  PAYMENT_PURPOSE_NOT_FOUND_MESSAGE,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2002, isP2025 } from "../shared/prisma-errors.js"
import { PaymentPurposeExecutionError } from "./errors.js"
import type {
  PaymentPurposeUseCaseResult,
  UpdatePaymentPurposeUseCaseInput,
} from "./types.js"

export async function updatePaymentPurposeUseCase(
  id: string,
  input: UpdatePaymentPurposeUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<PaymentPurposeUseCaseResult> {
  assertActorEmail(actorEmail, "updatePaymentPurposeUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.name !== undefined && !input.name.trim()) {
      throw new PaymentPurposeExecutionError({
        code: "PAYMENT_PURPOSE_VALIDATION_FAILED",
        message: PAYMENT_PURPOSE_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    try {
      return await updatePaymentPurposeRecord(id, { ...input, updatedBy: actorEmail }, c)
    } catch (error) {
      if (isP2002(error, "name")) {
        throw new PaymentPurposeExecutionError({
          code: "PAYMENT_PURPOSE_NAME_CONFLICT",
          message: PAYMENT_PURPOSE_NAME_CONFLICT_MESSAGE,
          status: 409,
          field: "name",
        })
      }
      if (isP2025(error)) {
        throw new PaymentPurposeExecutionError({
          code: "PAYMENT_PURPOSE_NOT_FOUND",
          message: PAYMENT_PURPOSE_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
