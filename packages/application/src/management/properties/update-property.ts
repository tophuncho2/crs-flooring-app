import { Prisma, updatePropertyRecord, withDatabaseTransaction } from "@builders/db"
import {
  PROPERTY_NAME_REQUIRED_MESSAGE,
  PROPERTY_NOT_FOUND_MESSAGE,
  isBlankName,
} from "@builders/domain"
import { PropertyExecutionError } from "./errors.js"
import type { PropertyUseCaseResult, UpdatePropertyUseCaseInput } from "./types.js"

export async function updatePropertyUseCase(
  id: string,
  input: UpdatePropertyUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<PropertyUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("updatePropertyUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.name !== undefined && isBlankName(input.name)) {
      throw new PropertyExecutionError({
        code: "PROPERTY_VALIDATION_FAILED",
        message: PROPERTY_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "name",
      })
    }

    try {
      return await updatePropertyRecord(id, { ...input, updatedBy: actorEmail }, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new PropertyExecutionError({
          code: "PROPERTY_NOT_FOUND",
          message: PROPERTY_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
