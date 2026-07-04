import { Prisma, updateEntityTypeRecord, withDatabaseTransaction } from "@builders/db"
import {
  ENTITY_TYPE_NOT_FOUND_MESSAGE,
  ENTITY_TYPE_TYPE_REQUIRED_MESSAGE,
} from "@builders/domain"
import { EntityTypeExecutionError } from "./errors.js"
import type { EntityTypeUseCaseResult, UpdateEntityTypeUseCaseInput } from "./types.js"

export async function updateEntityTypeUseCase(
  id: string,
  input: UpdateEntityTypeUseCaseInput,
  actorEmail: string,
  client?: Prisma.TransactionClient,
): Promise<EntityTypeUseCaseResult> {
  if (!actorEmail || !actorEmail.trim()) {
    throw new Error("updateEntityTypeUseCase requires a non-empty actorEmail")
  }

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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
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
