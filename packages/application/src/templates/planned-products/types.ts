import type {
  TemplatePlannedProductRow,
  TemplatePlannedProductsDiff,
} from "@builders/domain"

export type SaveTemplatePlannedProductsSectionUseCaseInput = {
  templateId: string
  diff: TemplatePlannedProductsDiff
}

export type SaveTemplatePlannedProductsSectionUseCaseResult = {
  plannedProducts: TemplatePlannedProductRow[]
  tempIdMap: Record<string, string>
}
