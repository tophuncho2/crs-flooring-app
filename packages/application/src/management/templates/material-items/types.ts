import type { TemplateMaterialItemForm, TemplateMaterialItemRow } from "@builders/domain"

export type CreateTemplateMaterialItemUseCaseInput = {
  templateId: string
  form: TemplateMaterialItemForm
}

export type UpdateTemplateMaterialItemUseCaseInput = {
  id: string
  form: TemplateMaterialItemForm
}

export type DeleteTemplateMaterialItemUseCaseInput = {
  id: string
}

export type SaveTemplateMaterialItemsSectionUseCaseInput = {
  templateId: string
  next: Array<{ id: string | null; form: TemplateMaterialItemForm }>
}

export type TemplateMaterialItemUseCaseResult = TemplateMaterialItemRow
export type TemplateMaterialItemsSectionUseCaseResult = TemplateMaterialItemRow[]
