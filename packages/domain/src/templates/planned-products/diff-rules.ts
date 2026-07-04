import type { SectionDiff } from "../../shared/section-diff.js"
import type { TemplatePlannedProductForm } from "./types.js"

export type TemplatePlannedProductDraft = {
  tempId: string
  form: TemplatePlannedProductForm
}

export type TemplatePlannedProductUpdate = {
  id: string
  form: TemplatePlannedProductForm
}

export type TemplatePlannedProductDelete = {
  id: string
}

export type TemplatePlannedProductsDiff = SectionDiff<TemplatePlannedProductForm>
