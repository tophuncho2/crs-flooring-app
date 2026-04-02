import { formatCurrencyValue, sumLineTotals } from "@builders/domain"
import type { EditableMaterialItem } from "@/modules/shared/engines/record-view/contracts/material-item-contracts"
import type { EditableServiceItem } from "@/modules/shared/engines/record-view/contracts/service-item-contracts"
import type { EditableTemplateSalesRep } from "@/modules/templates/domain/sales-reps"
import type { DisplayCalculationRow } from "@/modules/shared/engines/record-view/contracts/calculation-row-contracts"

export type TemplateSectionMetricValue = {
  label: string
  value: string
}

export function buildTemplateMaterialSectionMetrics(
  items: EditableMaterialItem[],
  totalAmount?: number,
): TemplateSectionMetricValue[] {
  return [
    { label: "Items", value: `${items.length} ${items.length === 1 ? "item" : "items"}` },
    { label: "Material Cost", value: formatCurrencyValue(totalAmount ?? sumLineTotals(items)) },
  ]
}

export function buildTemplateServiceSectionMetrics(
  items: EditableServiceItem[],
  totalAmount?: number,
): TemplateSectionMetricValue[] {
  return [
    { label: "Items", value: `${items.length} ${items.length === 1 ? "item" : "items"}` },
    { label: "Service Cost", value: formatCurrencyValue(totalAmount ?? sumLineTotals(items)) },
  ]
}

export function buildTemplateSalesRepSectionMetrics(
  items: EditableTemplateSalesRep[],
  totalAmount?: number,
): TemplateSectionMetricValue[] {
  return [
    { label: "Items", value: `${items.length} ${items.length === 1 ? "item" : "items"}` },
    { label: "Rep Cost", value: formatCurrencyValue(totalAmount ?? 0) },
  ]
}

export function buildTemplateCalculationSectionMetrics(items: DisplayCalculationRow[]): TemplateSectionMetricValue[] {
  void items
  return []
}
