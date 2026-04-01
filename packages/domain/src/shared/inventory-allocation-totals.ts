export type InventoryAllocationTotals = {
  stockTotal: number
  cutTotal: number
  totalAllocated: number
  runningBalance: number
  unreservedTotal: number
  availableToAllocate: number
}

function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function buildInventoryAllocationTotals(input: {
  stockCount: string | number | null | undefined
  cutTotal: string | number | null | undefined
  reservedStockCount: string | number | null | undefined
}): InventoryAllocationTotals {
  const stockTotal = toNumber(input.stockCount)
  const cutTotal = toNumber(input.cutTotal)
  const totalAllocated = toNumber(input.reservedStockCount)
  const runningBalance = stockTotal - cutTotal
  const unreservedTotal = Math.max(0, runningBalance)
  const availableToAllocate = Math.max(0, unreservedTotal - totalAllocated)

  return {
    stockTotal,
    cutTotal,
    totalAllocated,
    runningBalance,
    unreservedTotal,
    availableToAllocate,
  }
}
