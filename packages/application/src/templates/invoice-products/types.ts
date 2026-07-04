import type {
  TemplateInvoiceProductRow,
  TemplateInvoiceProductsDiff,
} from "@builders/domain"

export type SaveTemplateInvoiceProductsSectionUseCaseInput = {
  templateId: string
  diff: TemplateInvoiceProductsDiff
}

export type SaveTemplateInvoiceProductsSectionUseCaseResult = {
  invoiceProducts: TemplateInvoiceProductRow[]
  tempIdMap: Record<string, string>
}
