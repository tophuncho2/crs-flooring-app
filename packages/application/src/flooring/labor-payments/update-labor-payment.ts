import { Prisma, updateLaborPaymentRecord, withDatabaseTransaction } from "@builders/db"
import {
  LABOR_PAYMENT_CONTACT_REQUIRED_MESSAGE,
  LABOR_PAYMENT_NOT_FOUND_MESSAGE,
} from "@builders/domain"
import { LaborPaymentExecutionError } from "./errors.js"
import type {
  LaborPaymentUseCaseResult,
  UpdateLaborPaymentUseCaseInput,
} from "./types.js"

export async function updateLaborPaymentUseCase(
  id: string,
  input: UpdateLaborPaymentUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<LaborPaymentUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.contactId !== undefined && !input.contactId.trim()) {
      throw new LaborPaymentExecutionError({
        code: "LABOR_PAYMENT_VALIDATION_FAILED",
        message: LABOR_PAYMENT_CONTACT_REQUIRED_MESSAGE,
        status: 400,
        field: "contactId",
      })
    }

    try {
      return await updateLaborPaymentRecord(id, input, c)
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
  })
}
