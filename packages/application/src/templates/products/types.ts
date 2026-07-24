import type {
  TemplateCommissionRow,
  TemplateCommissionsDiff,
  TemplatePlannedProductRow,
  TemplatePlannedProductsDiff,
  TemplateServiceItemRow,
  TemplateServiceItemsDiff,
} from "@builders/domain"

export type SaveTemplateProductsSectionUseCaseInput = {
  templateId: string
  // The "products" record section owns THREE editable tables saved in one atomic
  // diff: planned products + service / misc items + commissions. All ride one
  // transaction so a single Save is all-or-nothing across every table.
  plannedProducts: TemplatePlannedProductsDiff
  serviceItems: TemplateServiceItemsDiff
  commissions: TemplateCommissionsDiff
}

export type SaveTemplateProductsSectionUseCaseResult = {
  plannedProducts: TemplatePlannedProductRow[]
  serviceItems: TemplateServiceItemRow[]
  commissions: TemplateCommissionRow[]
  // Merged temp→persisted id map across all three tables. Keys are namespaced by the
  // client's row-id prefixes (planned-product vs service-item vs commission) so
  // never collide.
  tempIdMap: Record<string, string>
}
