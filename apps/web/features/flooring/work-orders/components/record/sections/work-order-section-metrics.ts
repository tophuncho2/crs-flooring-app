import { formatCurrencyValue, sumLineTotals } from "@/features/flooring/shared/line-items/line-totals"
import type { EditableServiceItem } from "@/features/flooring/shared/line-items/service-items-editor"
import type { EditableSalesRepItem } from "@/features/flooring/shared/line-items/sales-rep-items-editor"
import type { DisplayCalculationRow } from "@/features/flooring/shared/line-items/calculation-rows-table"
import type { WorkOrderMaterialItem } from "@/features/flooring/work-orders/types"

export type WorkOrderSectionMetricValue = {
  label: string
  value: string
}

export function buildMaterialSectionMetrics(items: WorkOrderMaterialItem[]): WorkOrderSectionMetricValue[] {
  const totalMaterialCost = sumLineTotals(items)
  const totalAllocatedCost = items.reduce((total, item) => total + item.materialExpense, 0)
  const completedCount = items.filter((item) => item.isAllocationDone).length
  const shortageCount = items.filter((item) => item.allocationStatus === "SHORTAGE").length

  return [
    { label: "Items", value: `${items.length} ${items.length === 1 ? "item" : "items"}` },
    { label: "Allocation", value: items.length === 0 ? "Done" : `${completedCount}/${items.length} done` },
    { label: "Shortages", value: String(shortageCount) },
    { label: "Material Cost", value: formatCurrencyValue(totalMaterialCost) },
    { label: "Allocated Cost", value: formatCurrencyValue(totalAllocatedCost) },
  ]
}

export function buildServiceSectionMetrics(
  items: EditableServiceItem[],
  totalAmount?: number,
): WorkOrderSectionMetricValue[] {
  return [
    { label: "Items", value: `${items.length} ${items.length === 1 ? "item" : "items"}` },
    { label: "Service Cost", value: formatCurrencyValue(totalAmount ?? sumLineTotals(items)) },
  ]
}

export function buildSalesRepSectionMetrics(
  items: EditableSalesRepItem[],
  totalAmount?: number,
): WorkOrderSectionMetricValue[] {
  return [
    { label: "Items", value: `${items.length} ${items.length === 1 ? "item" : "items"}` },
    { label: "Rep Cost", value: formatCurrencyValue(totalAmount ?? 0) },
  ]
}

export function buildCalculationSectionMetrics(items: DisplayCalculationRow[]): WorkOrderSectionMetricValue[] {
  void items
  return []
}
