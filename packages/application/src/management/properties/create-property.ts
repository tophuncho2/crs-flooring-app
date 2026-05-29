import { Prisma, createPropertyRecord, withDatabaseTransaction } from "@builders/db"
import { PROPERTY_NAME_REQUIRED_MESSAGE, isBlankName } from "@builders/domain"
import { PropertyExecutionError } from "./errors.js"
import type { CreatePropertyUseCaseInput, PropertyUseCaseResult } from "./types.js"

export async function createPropertyUseCase(
  input: CreatePropertyUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<PropertyUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (isBlankName(input.name)) {
      throw new PropertyExecutionError({
        code: "PROPERTY_VALIDATION_FAILED",
        message: PROPERTY_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    return await createPropertyRecord(input, c)
  })
}
