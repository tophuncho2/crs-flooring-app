import { runUseCase } from "@/features/flooring/shared/application/run-use-case"
import { syncTemplateToWorkOrderUseCase } from "@/features/flooring/work-orders/application/sync-template"
import { validateSyncTemplateToWorkOrderInput } from "@/features/flooring/work-orders/validators"

export function runTemplateSyncUseCase(workOrderId: string, body: Record<string, unknown>) {
  return runUseCase(() => syncTemplateToWorkOrderUseCase(workOrderId, validateSyncTemplateToWorkOrderInput(body)))
}
