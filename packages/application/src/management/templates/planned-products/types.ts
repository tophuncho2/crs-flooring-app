import type {
  TemplateMaterialItemRow,
  TemplateMaterialItemsDiff,
} from "@builders/domain"

export type SaveTemplateMaterialItemsSectionUseCaseInput = {
  templateId: string
  diff: TemplateMaterialItemsDiff
}

export type SaveTemplateMaterialItemsSectionUseCaseResult = {
  items: TemplateMaterialItemRow[]
  tempIdMap: Record<string, string>
}
