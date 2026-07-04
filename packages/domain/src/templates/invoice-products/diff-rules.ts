import type { SectionDiff } from "../../shared/section-diff.js"
import type { TemplateInvoiceProductForm } from "./types.js"

export type TemplateInvoiceProductDraft = {
  tempId: string
  form: TemplateInvoiceProductForm
}

export type TemplateInvoiceProductUpdate = {
  id: string
  form: TemplateInvoiceProductForm
}

export type TemplateInvoiceProductDelete = {
  id: string
}

export type TemplateInvoiceProductsDiff = SectionDiff<TemplateInvoiceProductForm>
