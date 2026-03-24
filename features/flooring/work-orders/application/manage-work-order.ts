import { createWorkOrder, deleteWorkOrder, updateWorkOrder } from "@/features/flooring/work-orders/mutations"
import { validateCreateWorkOrderInput, validateUpdateWorkOrderInput } from "@/features/flooring/work-orders/validators"

export async function createWorkOrderUseCase(body: Record<string, unknown>) {
  return createWorkOrder(validateCreateWorkOrderInput(body))
}

export async function updateWorkOrderUseCase(id: string, body: Record<string, unknown>) {
  return updateWorkOrder(id, validateUpdateWorkOrderInput(body))
}

export async function deleteWorkOrderUseCase(id: string) {
  await deleteWorkOrder(id)
  return { ok: true as const }
}
