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
  client?: Prisma.TransactionClient,
): Promise<EntityUseCaseResult> {
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
      return await updateEntityRecord(id, input, c)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new EntityExecutionError({
          code: "ENTITY_NOT_FOUND",
          message: ENTITY_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }
  })
}
