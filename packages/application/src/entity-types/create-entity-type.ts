import { Prisma, createEntityTypeRecord, withDatabaseTransaction } from "@builders/db"
import { ENTITY_TYPE_TYPE_REQUIRED_MESSAGE } from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { EntityTypeExecutionError } from "./errors.js"
import type { CreateEntityTypeUseCaseInput, EntityTypeUseCaseResult } from "./types.js"

export async function createEntityTypeUseCase(
  input: CreateEntityTypeUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<EntityTypeUseCaseResult> {
  assertActorEmail(actorEmail, "createEntityTypeUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (!input.type || !input.type.trim()) {
      throw new EntityTypeExecutionError({
        code: "ENTITY_TYPE_VALIDATION_FAILED",
        message: ENTITY_TYPE_TYPE_REQUIRED_MESSAGE,
        status: 400,
        field: "type",
      })
    }

    return createEntityTypeRecord(
      { ...input, createdBy: actorEmail, updatedBy: actorEmail },
      c,
    )
  })
}
