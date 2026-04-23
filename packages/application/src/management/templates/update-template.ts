import { Prisma, updateTemplateRecord, withDatabaseTransaction } from "@builders/db"
import {
  TEMPLATE_NOT_FOUND_MESSAGE,
  TEMPLATE_PROPERTY_REQUIRED_MESSAGE,
  TEMPLATE_UNIT_TYPE_REQUIRED_MESSAGE,
} from "@builders/domain"
import { TemplateExecutionError } from "./errors.js"
import type { TemplateUseCaseResult, UpdateTemplateUseCaseInput } from "./types.js"

export async function updateTemplateUseCase(
  id: string,
  input: UpdateTemplateUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<TemplateUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.propertyId !== undefined && !input.propertyId.trim()) {
      throw new TemplateExecutionError({
        code: "TEMPLATE_VALIDATION_FAILED",
        message: TEMPLATE_PROPERTY_REQUIRED_MESSAGE,
        status: 400,
        field: "propertyId",
      })
    }

    if (input.unitType !== undefined && !input.unitType.trim()) {
      throw new TemplateExecutionError({
        code: "TEMPLATE_VALIDATION_FAILED",
        message: TEMPLATE_UNIT_TYPE_REQUIRED_MESSAGE,
        status: 400,
        field: "unitType",
      })
    }

    try {
      return await updateTemplateRecord(id, input, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new TemplateExecutionError({
          code: "TEMPLATE_NOT_FOUND",
          message: TEMPLATE_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
