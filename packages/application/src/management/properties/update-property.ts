import { Prisma, propertyNameExists, updatePropertyRecord, withDatabaseTransaction } from "@builders/db"
import {
  PROPERTY_NAME_CONFLICT_MESSAGE,
  PROPERTY_NAME_REQUIRED_MESSAGE,
  PROPERTY_NOT_FOUND_MESSAGE,
  isPropertyNameConflict,
  normalizePropertyNameForUniqueness,
} from "@builders/domain"
import { isP2002 } from "../../shared/prisma-errors.js"
import { PropertyExecutionError } from "./errors.js"
import type { PropertyUseCaseResult, UpdatePropertyUseCaseInput } from "./types.js"

export async function updatePropertyUseCase(
  id: string,
  input: UpdatePropertyUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<PropertyUseCaseResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.name !== undefined && !input.name.trim()) {
      throw new PropertyExecutionError({
        code: "PROPERTY_VALIDATION_FAILED",
        message: PROPERTY_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    const nameNormalized =
      input.name !== undefined ? normalizePropertyNameForUniqueness(input.name) : undefined

    if (
      nameNormalized !== undefined &&
      isPropertyNameConflict(await propertyNameExists(nameNormalized, id, c))
    ) {
      throw new PropertyExecutionError({
        code: "PROPERTY_NAME_CONFLICT",
        message: PROPERTY_NAME_CONFLICT_MESSAGE,
        status: 409,
        field: "name",
      })
    }

    try {
      return await updatePropertyRecord(
        id,
        nameNormalized !== undefined ? { ...input, nameNormalized } : input,
        c,
      )
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new PropertyExecutionError({
          code: "PROPERTY_NOT_FOUND",
          message: PROPERTY_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
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
