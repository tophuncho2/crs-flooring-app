import type {
  WorkOrderPlannedPaymentRow,
  WorkOrderPlannedPaymentsDiff,
} from "@builders/domain"

export type SaveWorkOrderPlannedPaymentsSectionUseCaseInput = {
  workOrderId: string
  diff: WorkOrderPlannedPaymentsDiff
}

export type SaveWorkOrderPlannedPaymentsSectionUseCaseResult = {
  plannedPayments: WorkOrderPlannedPaymentRow[]
  tempIdMap: Record<string, string>
}
