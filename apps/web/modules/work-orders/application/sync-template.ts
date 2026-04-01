import { syncTemplateToWorkOrder } from "@/modules/work-orders/domain/syncTemplate"
import type { SyncTemplateToWorkOrderInput } from "@/modules/work-orders/validators"

export async function syncTemplateToWorkOrderUseCase(workOrderId: string, input: SyncTemplateToWorkOrderInput) {
  return syncTemplateToWorkOrder(workOrderId, input)
}
