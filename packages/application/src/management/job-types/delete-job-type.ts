import { Prisma, deleteJobTypeRecordById, withDatabaseTransaction } from "@builders/db"
import { JOB_TYPE_NOT_FOUND_MESSAGE } from "@builders/domain"
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
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
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
