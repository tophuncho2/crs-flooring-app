import { updateServiceRecord, getServiceById } from "@builders/db"
import type { ServiceInput, ServiceResult } from "./types.js"

export async function updateServiceUseCase(id: string, input: ServiceInput): Promise<ServiceResult> {
  await updateServiceRecord(id, input)
  return getServiceById(id)
}
