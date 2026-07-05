import type { SectionDiff } from "../../shared/section-diff.js"
import type { TemplatePlannedPaymentForm } from "./types.js"

export type TemplatePlannedPaymentDraft = {
  tempId: string
  form: TemplatePlannedPaymentForm
}

export type TemplatePlannedPaymentUpdate = {
  id: string
  form: TemplatePlannedPaymentForm
}

export type TemplatePlannedPaymentDelete = {
  id: string
}

export type TemplatePlannedPaymentsDiff = SectionDiff<TemplatePlannedPaymentForm>
