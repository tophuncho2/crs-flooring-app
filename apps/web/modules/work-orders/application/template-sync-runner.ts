import { runUseCase } from "@/modules/shared/engines/common/application/run-use-case"
import { syncTemplateToWorkOrderUseCase } from "@/modules/work-orders/application/sync-template"
import { validateSyncTemplateToWorkOrderInput } from "@/modules/work-orders/validators"

export function runTemplateSyncUseCase(workOrderId: string, body: Record<string, unknown>) {
  return runUseCase(() => syncTemplateToWorkOrderUseCase(workOrderId, validateSyncTemplateToWorkOrderInput(body)))
}
