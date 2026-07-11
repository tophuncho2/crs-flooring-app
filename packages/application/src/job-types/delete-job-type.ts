import { Prisma, deleteJobTypeRecordById, withDatabaseTransaction } from "@builders/db"
import { JOB_TYPE_NOT_FOUND_MESSAGE } from "@builders/domain"
import { isP2025 } from "../shared/prisma-errors.js"
import { JobTypeExecutionError } from "./errors.js"

export async function deleteJobTypeUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    try {
      await deleteJobTypeRecordById(id, c)
    } catch (error) {
      if (isP2025(error)) {
        throw new JobTypeExecutionError({
          code: "JOB_TYPE_NOT_FOUND",
          message: JOB_TYPE_NOT_FOUND_MESSAGE,
          status: 404,
        })
      }
      throw error
    }

    return { ok: true }
  })
}
