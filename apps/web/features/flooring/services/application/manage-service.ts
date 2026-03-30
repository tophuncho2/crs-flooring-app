import { getServiceDeleteBlockedMessage, isServiceDeleteBlocked } from "@builders/domain"
import { createAppError } from "@/server/http/api-helpers"
import {
  createServiceRecord,
  deleteServiceRecordById,
  getServiceDeleteState,
  updateServiceRecord,
} from "../data/server-records"
import { getServiceById } from "../data/queries"

type ServiceInput = {
  name: string
  unitId: string
  baseCost: string | number
  notes: string | null
}

export async function createServiceEntry(input: ServiceInput) {
  const created = await createServiceRecord(input)
  return getServiceById(created.id)
}

export async function updateServiceEntry(id: string, input: ServiceInput) {
  await updateServiceRecord(id, input)
  return getServiceById(id)
}

export async function deleteServiceEntry(id: string) {
  const service = await getServiceDeleteState(id)

  if (!service) {
    throw createAppError("Service not found", { status: 404 })
  }

  const linkState = {
    templateItems: service._count.templateItems,
    workOrderItems: service._count.workOrderItems,
  }

  if (isServiceDeleteBlocked(linkState)) {
    throw createAppError(getServiceDeleteBlockedMessage(linkState), { status: 409 })
  }

  await deleteServiceRecordById(id)
  return { ok: true as const }
}
