import { Prisma, deleteEntityTypeRecordById, withDatabaseTransaction } from "@builders/db"
import { ENTITY_TYPE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { isP2025 } from "../shared/prisma-errors.js"
import { EntityTypeExecutionError } from "./errors.js"

export async function deleteEntityTypeUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteEntityTypeRecordById(id, c)
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

    return { ok: true }
  })
}
