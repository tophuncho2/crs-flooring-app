import { createWorkOrder, deleteWorkOrder, updateWorkOrder } from "@/features/flooring/work-orders/mutations"
import type { CreateWorkOrderInput, UpdateWorkOrderInput } from "@/features/flooring/work-orders/validators"

export async function createWorkOrderUseCase(input: CreateWorkOrderInput) {
  return createWorkOrder(input)
}

export async function updateWorkOrderUseCase(id: string, input: UpdateWorkOrderInput) {
  return updateWorkOrder(id, input)
}

export async function deleteWorkOrderUseCase(id: string) {
  await deleteWorkOrder(id)
  return { ok: true as const }
}
