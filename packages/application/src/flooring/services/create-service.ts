import { createServiceRecord, getServiceById } from "@builders/db"
import type { ServiceInput, ServiceResult } from "./types.js"

export async function createServiceUseCase(input: ServiceInput): Promise<ServiceResult> {
  const created = await createServiceRecord(input)
  return getServiceById(created.id)
}
