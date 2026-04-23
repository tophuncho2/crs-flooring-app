import { hasCoverageUnit } from "./rules.js"

export function convertStockToCoverage(input: {
  stockAmount: number
  coveragePerUnit: number | null
  categorySlug: string | null
}): number | null {
  if (input.coveragePerUnit === null) return null
  if (!hasCoverageUnit(input.categorySlug)) return null
  return input.stockAmount * input.coveragePerUnit
}
