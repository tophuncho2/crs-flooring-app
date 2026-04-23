import type {
  TemplateMaterialItemForm,
  TemplateMaterialItemRow,
  TemplateMaterialItemsDiff,
} from "@builders/domain"

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
  diff: TemplateMaterialItemsDiff
}

export type TemplateMaterialItemUseCaseResult = TemplateMaterialItemRow

export type SaveTemplateMaterialItemsSectionUseCaseResult = {
  items: TemplateMaterialItemRow[]
  tempIdMap: Record<string, string>
}
