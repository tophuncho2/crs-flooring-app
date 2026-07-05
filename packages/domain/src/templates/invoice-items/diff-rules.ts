import type { SectionDiff } from "../../shared/section-diff.js"
import type { TemplateInvoiceItemForm } from "./types.js"

export type TemplateInvoiceItemDraft = {
  tempId: string
  form: TemplateInvoiceItemForm
}

export type TemplateInvoiceItemUpdate = {
  id: string
  form: TemplateInvoiceItemForm
}

export type TemplateInvoiceItemDelete = {
  id: string
}

export type TemplateInvoiceItemsDiff = SectionDiff<TemplateInvoiceItemForm>
