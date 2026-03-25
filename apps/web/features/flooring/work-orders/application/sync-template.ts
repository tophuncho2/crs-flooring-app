import { syncTemplateToWorkOrder } from "@/features/flooring/work-orders/domain/syncTemplate"
import { validateSyncTemplateToWorkOrderInput } from "@/features/flooring/work-orders/validators"

export async function syncTemplateToWorkOrderUseCase(workOrderId: string, body: Record<string, unknown>) {
  return syncTemplateToWorkOrder(workOrderId, validateSyncTemplateToWorkOrderInput(body))
}
