import { runUseCase } from "@/features/flooring/shared/application/run-use-case"
import { syncTemplateToWorkOrderUseCase } from "@/features/flooring/work-orders/application/sync-template"

export function runTemplateSyncUseCase(workOrderId: string, body: Record<string, unknown>) {
  return runUseCase(() => syncTemplateToWorkOrderUseCase(workOrderId, body))
}
