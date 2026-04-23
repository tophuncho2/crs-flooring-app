import { Prisma, createTemplateRecord, withDatabaseTransaction } from "@builders/db"
import {
  TEMPLATE_PROPERTY_REQUIRED_MESSAGE,
  TEMPLATE_UNIT_TYPE_REQUIRED_MESSAGE,
} from "@builders/domain"
import { TemplateExecutionError } from "./errors.js"
import type { CreateTemplateUseCaseInput, TemplateUseCaseResult } from "./types.js"

export async function createTemplateUseCase(
  input: CreateTemplateUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<TemplateUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (!input.propertyId || !input.propertyId.trim()) {
      throw new TemplateExecutionError({
        code: "TEMPLATE_VALIDATION_FAILED",
        message: TEMPLATE_PROPERTY_REQUIRED_MESSAGE,
        status: 400,
        field: "propertyId",
      })
    }

    if (!input.unitType || !input.unitType.trim()) {
      throw new TemplateExecutionError({
        code: "TEMPLATE_VALIDATION_FAILED",
        message: TEMPLATE_UNIT_TYPE_REQUIRED_MESSAGE,
        status: 400,
        field: "unitType",
      })
    }

    return createTemplateRecord(input, c)
  })
}
