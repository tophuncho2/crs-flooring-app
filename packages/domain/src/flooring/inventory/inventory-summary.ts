import { formatCurrencyValue } from "../../shared/line-totals.js"

export type InventoryCostRow = {
  cost: string | number
  freight: string | number
}

export type InventoryCostSummary = {
  rowCount: number
  totalCost: number
  totalCostLabel: string
}

function toNumber(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Aggregate cost + freight across a set of inventory rows.
 *
 * Pure, shape-agnostic: accepts any row with `cost` and `freight` fields
 * (string or number). Used by product / inventory record views to display
 * a bottom-line summary.
 */
export function calculateInventoryCostSummary(rows: InventoryCostRow[]): InventoryCostSummary {
  const totalCost = rows.reduce((sum, row) => sum + toNumber(row.cost) + toNumber(row.freight), 0)
  return {
    rowCount: rows.length,
    totalCost,
    totalCostLabel: formatCurrencyValue(totalCost),
  }
}
