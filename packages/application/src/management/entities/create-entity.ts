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

    try {
      return await createEntityRecord(input, c)
    } catch (error) {
      // A typeId that points at no entity-type row trips the FK (P2003).
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        throw new EntityExecutionError({
          code: "ENTITY_INVALID_TYPE",
          message: "One or more entity types could not be found",
          status: 400,
          field: "typeIds",
        })
      }
      throw error
    }
  })
}
