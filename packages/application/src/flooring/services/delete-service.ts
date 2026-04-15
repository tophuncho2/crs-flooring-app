import { Prisma, getServiceDeleteState, deleteServiceRecordById, withDatabaseTransaction } from "@builders/db"
import { isServiceDeleteBlocked, getServiceDeleteBlockedMessage } from "@builders/domain"
import { ServiceExecutionError } from "./errors.js"

export async function deleteServiceUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    const service = await getServiceDeleteState(id, c)

    if (!service) {
      throw new ServiceExecutionError({
        code: "SERVICE_NOT_FOUND",
        message: "Service not found",
        status: 404,
      })
    }

    const linkState = {
      templateItems: service._count.templateItems,
      workOrderItems: service._count.workOrderItems,
    }

    if (isServiceDeleteBlocked(linkState)) {
      throw new ServiceExecutionError({
        code: "SERVICE_IN_USE",
        message: getServiceDeleteBlockedMessage(linkState),
        status: 409,
      })
    }

    await deleteServiceRecordById(id, c)
    return { ok: true }
  })
}
