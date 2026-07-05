import type {
  TemplatePlannedPaymentRow,
  TemplatePlannedPaymentsDiff,
} from "@builders/domain"

export type SaveTemplatePlannedPaymentsSectionUseCaseInput = {
  templateId: string
  diff: TemplatePlannedPaymentsDiff
}

export type SaveTemplatePlannedPaymentsSectionUseCaseResult = {
  plannedPayments: TemplatePlannedPaymentRow[]
  tempIdMap: Record<string, string>
}
