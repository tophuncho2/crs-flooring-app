import { syncTemplateToWorkOrder } from "@/modules/work-orders/domain/template-sync-rules"
import type { SyncTemplateToWorkOrderInput } from "@/modules/work-orders/validators"

export async function syncTemplateToWorkOrderUseCase(workOrderId: string, input: SyncTemplateToWorkOrderInput) {
  return syncTemplateToWorkOrder(workOrderId, input)
}
