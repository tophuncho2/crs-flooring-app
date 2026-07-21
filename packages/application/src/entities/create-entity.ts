import { Prisma, createEntityRecord, withDatabaseTransaction } from "@builders/db"
import {
  ENTITY_NAME_REQUIRED_MESSAGE,
  isBlankName,
} from "@builders/domain"
import { assertActorEmail } from "../shared/assert-actor-email.js"
import { isP2003 } from "../shared/prisma-errors.js"
import { EntityExecutionError } from "./errors.js"
import type {
  CreateEntityUseCaseInput,
  EntityUseCaseResult,
} from "./types.js"

export async function createEntityUseCase(
  input: CreateEntityUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<EntityUseCaseResult> {
  assertActorEmail(actorEmail, "createEntityUseCase")

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (isBlankName(input.entity)) {
      throw new EntityExecutionError({
        code: "ENTITY_VALIDATION_FAILED",
        message: ENTITY_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "entity",
      })
    }

    try {
      return await createEntityRecord(
        { ...input, createdBy: actorEmail, updatedBy: actorEmail },
        c,
      )
    } catch (error) {
      // A typeId that points at no entity-type row trips the FK (P2003).
      if (isP2003(error)) {
        throw new EntityExecutionError({
          code: "ENTITY_INVALID_TYPE",
          message: "The selected entity type could not be found",
          status: 400,
          field: "typeId",
        })
      }
      throw error
    }
  })
}
