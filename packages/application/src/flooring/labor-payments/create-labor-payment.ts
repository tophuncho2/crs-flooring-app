import { Prisma, createLaborPaymentRecord, withDatabaseTransaction } from "@builders/db"
import {
  LABOR_PAYMENT_CONTACT_NOT_FOUND_MESSAGE,
  LABOR_PAYMENT_CONTACT_REQUIRED_MESSAGE,
} from "@builders/domain"
import { LaborPaymentExecutionError } from "./errors.js"
import type {
  CreateLaborPaymentUseCaseInput,
  LaborPaymentUseCaseResult,
} from "./types.js"

export async function createLaborPaymentUseCase(
  input: CreateLaborPaymentUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<LaborPaymentUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (!input.contactId || !input.contactId.trim()) {
      throw new LaborPaymentExecutionError({
        code: "LABOR_PAYMENT_VALIDATION_FAILED",
        message: LABOR_PAYMENT_CONTACT_REQUIRED_MESSAGE,
        status: 400,
        field: "contactId",
      })
    }

    try {
      return await createLaborPaymentRecord(input, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new LaborPaymentExecutionError({
          code: "LABOR_PAYMENT_CONTACT_NOT_FOUND",
          message: LABOR_PAYMENT_CONTACT_NOT_FOUND_MESSAGE,
          status: 404,
          field: "contactId",
        })
      }
      throw error
    }
  })
}
