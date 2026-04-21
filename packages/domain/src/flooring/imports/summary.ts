import { formatCurrencyValue } from "../../shared/line-totals.js"

export type ImportSummaryItem = {
  stockCount: string | number
  cost: string | number
  freight: string | number
}

function toNumber(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateImportItemTotal(item: ImportSummaryItem) {
  return toNumber(item.cost) + toNumber(item.freight)
}

export function calculateImportSummary(input: ImportSummaryItem[]) {
  const materialItemsCount = input.length
  const totalCost = input.reduce((sum, item) => sum + calculateImportItemTotal(item), 0)

  return {
    materialItemsCount,
    totalCost,
    totalCostLabel: formatCurrencyValue(totalCost),
  }
}
