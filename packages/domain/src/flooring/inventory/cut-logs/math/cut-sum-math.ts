import { CutLogDomainError } from "../errors.js"

export type CutSumRowInput = {
  cut: string | number | null
  void: boolean
}

export function computeTotalCutSum(rows: ReadonlyArray<CutSumRowInput>): string {
  let total = 0
  for (const row of rows) {
    if (row.void) continue
    if (row.cut === null) continue
    const value = Number(row.cut)
    if (!Number.isFinite(value)) continue
    total += value
  }
  return total.toFixed(2)
}

export function assertCutSumWithinStartingStock(input: {
  totalCutSum: string | number
  startingStock: string | number
}): void {
  const sum = Number(input.totalCutSum)
  const stock = Number(input.startingStock)
  if (!Number.isFinite(sum) || !Number.isFinite(stock)) {
    throw new CutLogDomainError("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK", {
      totalCutSum: input.totalCutSum,
      startingStock: input.startingStock,
      reason: "non-finite-input",
    })
  }
  if (sum > stock) {
    throw new CutLogDomainError("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK", {
      totalCutSum: sum,
      startingStock: stock,
      overage: sum - stock,
    })
  }
}

export function isCutSumWithinStartingStock(input: {
  totalCutSum: string | number
  startingStock: string | number
}): boolean {
  const sum = Number(input.totalCutSum)
  const stock = Number(input.startingStock)
  if (!Number.isFinite(sum) || !Number.isFinite(stock)) return false
  return sum <= stock
}
