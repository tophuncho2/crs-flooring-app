import { Prisma, updateEntityTypeRecord, withDatabaseTransaction } from "@builders/db"
import {
  ENTITY_TYPE_NOT_FOUND_MESSAGE,
  ENTITY_TYPE_TYPE_REQUIRED_MESSAGE,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2025 } from "../shared/prisma-errors.js"
import { EntityTypeExecutionError } from "./errors.js"
import type { EntityTypeUseCaseResult, UpdateEntityTypeUseCaseInput } from "./types.js"

export async function updateEntityTypeUseCase(
  id: string,
  input: UpdateEntityTypeUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<EntityTypeUseCaseResult> {
  assertActorEmail(actorEmail, "updateEntityTypeUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.type !== undefined && !input.type.trim()) {
      throw new EntityTypeExecutionError({
        code: "ENTITY_TYPE_VALIDATION_FAILED",
        message: ENTITY_TYPE_TYPE_REQUIRED_MESSAGE,
        status: 400,
        field: "type",
      })
    }

    try {
      return await updateEntityTypeRecord(id, { ...input, updatedBy: actorEmail }, c)
    } catch (error) {
      if (isP2025(error)) {
        throw new EntityTypeExecutionError({
          code: "ENTITY_TYPE_NOT_FOUND",
          message: ENTITY_TYPE_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
