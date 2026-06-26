import { Prisma, updateEntityRecord, withDatabaseTransaction } from "@builders/db"
import {
  ENTITY_NAME_REQUIRED_MESSAGE,
  ENTITY_NOT_FOUND_MESSAGE,
  isBlankName,
} from "@builders/domain"
import { EntityExecutionError } from "./errors.js"
import type {
  EntityUseCaseResult,
  UpdateEntityUseCaseInput,
} from "./types.js"

export async function updateEntityUseCase(
  id: string,
  input: UpdateEntityUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<EntityUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("updateEntityUseCase requires a non-empty actorEmail")
  }

  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    if (input.entity !== undefined && isBlankName(input.entity)) {
      throw new EntityExecutionError({
        code: "ENTITY_VALIDATION_FAILED",
        message: ENTITY_NAME_REQUIRED_MESSAGE,
        status: 400,
        field: "entity",
      })
    }

    try {
      return await updateEntityRecord(id, { ...input, updatedBy: actorEmail }, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new EntityExecutionError({
          code: "ENTITY_NOT_FOUND",
          message: ENTITY_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
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
