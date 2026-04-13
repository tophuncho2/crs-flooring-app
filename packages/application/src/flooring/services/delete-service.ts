import { getServiceDeleteState, deleteServiceRecordById } from "@builders/db"
import { isServiceDeleteBlocked, getServiceDeleteBlockedMessage } from "@builders/domain"
import { ServiceExecutionError } from "./errors.js"

export async function deleteServiceUseCase(id: string): Promise<{ ok: true }> {
  const service = await getServiceDeleteState(id)

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

  await deleteServiceRecordById(id)
  return { ok: true }
}
