import { syncTemplateToWorkOrder } from "@/features/flooring/work-orders/domain/syncTemplate"
import type { SyncTemplateToWorkOrderInput } from "@/features/flooring/work-orders/validators"

export async function syncTemplateToWorkOrderUseCase(workOrderId: string, input: SyncTemplateToWorkOrderInput) {
  return syncTemplateToWorkOrder(workOrderId, input)
}
