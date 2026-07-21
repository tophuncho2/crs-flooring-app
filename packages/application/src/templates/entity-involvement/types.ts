import type {
  TemplateEntityInvolvementRow,
  TemplateEntityInvolvementsDiff,
} from "@builders/domain"

export type SaveTemplateEntityInvolvementSectionUseCaseInput = {
  templateId: string
  diff: TemplateEntityInvolvementsDiff
}

export type SaveTemplateEntityInvolvementSectionUseCaseResult = {
  entityInvolvements: TemplateEntityInvolvementRow[]
  tempIdMap: Record<string, string>
}
