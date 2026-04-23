import {
  Prisma,
  countTemplatesByJobTypeId,
  countWorkOrdersByJobTypeId,
  deleteJobTypeRecordById,
  withDatabaseTransaction,
} from "@builders/db"
import {
  JOB_TYPE_NOT_FOUND_MESSAGE,
  getJobTypeDeleteBlockedMessage,
  isJobTypeDeleteBlocked,
} from "@builders/domain"
import { JobTypeExecutionError } from "./errors.js"

export async function deleteJobTypeUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const [workOrderCount, templateCount] = await Promise.all([
      countWorkOrdersByJobTypeId(id, c),
      countTemplatesByJobTypeId(id, c),
    ])
    const linkState = { workOrderCount, templateCount }

    if (isJobTypeDeleteBlocked(linkState)) {
      throw new JobTypeExecutionError({
        code: "JOB_TYPE_IN_USE",
        message: getJobTypeDeleteBlockedMessage(linkState),
        status: 409,
      })
    }

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
