import { categoryRequiresCoveragePerUnit } from "../categories/rules.js"
import { parseInventoryDecimal } from "./formatters.js"

export function computeInventoryBalance(input: {
  startingStock: string
  netDeducted: string
}): number {
  const starting = parseInventoryDecimal(input.startingStock)
  const netDeducted = parseInventoryDecimal(input.netDeducted)
  const balance = starting - netDeducted
  return balance < 0 ? 0 : balance
}

export function computeInventoryCoverage(input: {
  balance: number
  coveragePerUnit: string | null
  categorySlug: string | null
}): number | null {
  if (!categoryRequiresCoveragePerUnit(input.categorySlug)) return null
  if (input.coveragePerUnit === null) return null
  const perUnit = parseInventoryDecimal(input.coveragePerUnit)
  if (!Number.isFinite(perUnit) || perUnit <= 0) return null
  return input.balance * perUnit
}

export function buildInventoryOversoldMessage(input: {
  requestedQuantity: string
  availableBalance: string
  stockUnitAbbrev: string | null
}): string {
  const unit =
    input.stockUnitAbbrev && input.stockUnitAbbrev.length > 0 ? ` ${input.stockUnitAbbrev}` : ""
  return `Cannot deduct ${input.requestedQuantity}${unit}: only ${input.availableBalance}${unit} available.`
}
