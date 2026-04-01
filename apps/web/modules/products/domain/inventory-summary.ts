import { formatCurrencyValue } from "@/modules/shared/domain/line-totals"

type ProductInventoryCostRow = {
  cost: string | number
  freight: string | number
}

function toNumber(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateProductInventorySummary(rows: ProductInventoryCostRow[]) {
  const totalCost = rows.reduce((sum, row) => sum + toNumber(row.cost) + toNumber(row.freight), 0)

  return {
    rowCount: rows.length,
    totalCost,
    totalCostLabel: formatCurrencyValue(totalCost),
  }
}
