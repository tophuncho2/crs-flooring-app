import type {
  TemplateInvoiceItemRow,
  TemplateInvoiceItemsDiff,
} from "@builders/domain"

export type SaveTemplateInvoiceItemsSectionUseCaseInput = {
  templateId: string
  diff: TemplateInvoiceItemsDiff
}

export type SaveTemplateInvoiceItemsSectionUseCaseResult = {
  invoiceItems: TemplateInvoiceItemRow[]
  tempIdMap: Record<string, string>
}
