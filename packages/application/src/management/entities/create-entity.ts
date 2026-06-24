import { Prisma, createEntityRecord, withDatabaseTransaction } from "@builders/db"
import {
  ENTITY_NAME_REQUIRED_MESSAGE,
  isBlankName,
} from "@builders/domain"
import { EntityExecutionError } from "./errors.js"
import type {
  CreateEntityUseCaseInput,
  EntityUseCaseResult,
} from "./types.js"

export async function createEntityUseCase(
  input: CreateEntityUseCaseInput,
  client?: Prisma.TransactionClient,
): Promise<EntityUseCaseResult> {
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

    return await createEntityRecord(input, c)
  })
}
