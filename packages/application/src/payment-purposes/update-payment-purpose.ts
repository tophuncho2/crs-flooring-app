import { Prisma, updatePaymentPurposeRecord, withDatabaseTransaction } from "@builders/db"
import {
  PAYMENT_PURPOSE_NAME_CONFLICT_MESSAGE,
  PAYMENT_PURPOSE_NAME_REQUIRED_MESSAGE,
  PAYMENT_PURPOSE_NOT_FOUND_MESSAGE,
} from "@builders/domain"
import { isP2002 } from "../shared/prisma-errors.js"
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
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("updatePaymentPurposeUseCase requires a non-empty actorEmail")
  }

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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
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
