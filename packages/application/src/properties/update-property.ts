import { Prisma, updatePropertyRecord, withDatabaseTransaction } from "@builders/db"
import {
  PROPERTY_NAME_REQUIRED_MESSAGE,
  PROPERTY_NOT_FOUND_MESSAGE,
  isBlankName,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2025 } from "../shared/prisma-errors.js"
import { PropertyExecutionError } from "./errors.js"
import type { PropertyUseCaseResult, UpdatePropertyUseCaseInput } from "./types.js"

export async function updatePropertyUseCase(
  id: string,
  input: UpdatePropertyUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<PropertyUseCaseResult> {
  assertActorEmail(actorEmail, "updatePropertyUseCase")

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
      if (isP2025(error)) {
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
