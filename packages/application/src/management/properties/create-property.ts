import { Prisma, createPropertyRecord, propertyNameExists, withDatabaseTransaction } from "@builders/db"
import {
  PROPERTY_NAME_CONFLICT_MESSAGE,
  PROPERTY_NAME_REQUIRED_MESSAGE,
  isBlankName,
  isPropertyNameConflict,
  normalizePropertyNameForUniqueness,
} from "@builders/domain"
import { isP2002 } from "../../shared/prisma-errors.js"
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

    const nameNormalized = normalizePropertyNameForUniqueness(input.name)

    if (isPropertyNameConflict(await propertyNameExists(nameNormalized, undefined, c))) {
      throw new PropertyExecutionError({
        code: "PROPERTY_NAME_CONFLICT",
        message: PROPERTY_NAME_CONFLICT_MESSAGE,
        status: 409,
        field: "name",
      })
    }

    try {
      return await createPropertyRecord({ ...input, nameNormalized }, c)
    } catch (error) {
      if (isP2002(error, "nameNormalized")) {
        throw new PropertyExecutionError({
          code: "PROPERTY_NAME_CONFLICT",
          message: PROPERTY_NAME_CONFLICT_MESSAGE,
          status: 409,
          field: "name",
        })
      }
      throw error
    }
  })
}
