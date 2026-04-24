import { categoryRequiresCoveragePerUnit } from "../categories/rules.js"
import { parseInventoryDecimal } from "./formatters.js"

/**
 * Balance = startingStock − totalCutSum. Always defined; returns 0 if either
 * input is a malformed number string (per `parseInventoryDecimal` semantics).
 * Negative results are clamped to 0 defensively — an inventory row should
 * never go below zero once cut logs are applied, so a negative value would
 * indicate upstream math drift and isn't worth surfacing as "negative balance."
 */
export function computeInventoryBalance(input: {
  startingStock: string
  totalCutSum: string
}): number {
  const starting = parseInventoryDecimal(input.startingStock)
  const cut = parseInventoryDecimal(input.totalCutSum)
  const balance = starting - cut
  return balance < 0 ? 0 : balance
}

/**
 * Coverage = balance × coveragePerUnit, **only** when the row's category is
 * in the coverage-per-unit set. Returns `null` for non-coverage categories —
 * same null semantics used on the product + inventory columns: "no coverage
 * concept for this category." Null also propagates when `coveragePerUnit`
 * is missing (nullable on the column; worker only populates it for special
 * categories).
 */
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
