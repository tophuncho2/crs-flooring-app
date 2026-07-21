import type {
  TemplatePlannedProductRow,
  TemplatePlannedProductsDiff,
  TemplateServiceItemRow,
  TemplateServiceItemsDiff,
} from "@builders/domain"

export type SaveTemplateProductsSectionUseCaseInput = {
  templateId: string
  // The "products" record section owns TWO editable tables saved in one atomic
  // diff: planned products + service / misc items. Both ride one transaction so a
  // single Save is all-or-nothing across both tables.
  plannedProducts: TemplatePlannedProductsDiff
  serviceItems: TemplateServiceItemsDiff
}

export type SaveTemplateProductsSectionUseCaseResult = {
  plannedProducts: TemplatePlannedProductRow[]
  serviceItems: TemplateServiceItemRow[]
  // Merged temp→persisted id map across both tables. Keys are namespaced by the
  // client's row-id prefixes (planned-product vs service-item) so never collide.
  tempIdMap: Record<string, string>
}
