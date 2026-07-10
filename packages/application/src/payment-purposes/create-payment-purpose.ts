import { Prisma, createPaymentPurposeRecord, withDatabaseTransaction } from "@builders/db"
import {
  PAYMENT_PURPOSE_NAME_CONFLICT_MESSAGE,
  PAYMENT_PURPOSE_NAME_REQUIRED_MESSAGE,
} from "@builders/domain"
import { isP2002 } from "../shared/prisma-errors.js"
import { PaymentPurposeExecutionError } from "./errors.js"
import type {
  CreatePaymentPurposeUseCaseInput,
  PaymentPurposeUseCaseResult,
} from "./types.js"

export async function createPaymentPurposeUseCase(
  input: CreatePaymentPurposeUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<PaymentPurposeUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("createPaymentPurposeUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (!input.name || !input.name.trim()) {
      throw new PaymentPurposeExecutionError({
        code: "PAYMENT_PURPOSE_VALIDATION_FAILED",
        message: PAYMENT_PURPOSE_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    try {
      return await createPaymentPurposeRecord(
        { ...input, createdBy: actorEmail, updatedBy: actorEmail },
        c,
      )
    } catch (error) {
      if (isP2002(error, "name")) {
        throw new PaymentPurposeExecutionError({
          code: "PAYMENT_PURPOSE_NAME_CONFLICT",
          message: PAYMENT_PURPOSE_NAME_CONFLICT_MESSAGE,
          status: 409,
          field: "name",
        })
      }
      throw error
    }
  })
}
