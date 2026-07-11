import {
  Prisma,
  deleteEntityRecordById,
  withDatabaseTransaction,
} from "@builders/db"
import { ENTITY_NOT_FOUND_MESSAGE } from "@builders/domain"
import { isP2025 } from "../shared/prisma-errors.js"
import { EntityExecutionError } from "./errors.js"

export async function deleteEntityUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteEntityRecordById(id, c)
    } catch (error) {
      if (isP2025(error)) {
        throw new EntityExecutionError({
          code: "ENTITY_NOT_FOUND",
          message: ENTITY_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
