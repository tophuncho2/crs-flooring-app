import { normalizeAdjustmentMoneyAmount } from "./adjustments/money.js"
import { parseInventoryDecimal, toInventoryFixedString } from "./formatters.js"

/**
 * The share of a parent inventory money figure (cost or freight) attributable to
 * an adjustment of `quantity` units: `total × quantity / startingStock`, rounded
 * to the 3dp adjustment money scale and returned **unsigned** (the +/− sign is derived from the
 * adjustment type at display). Returns `null` when `total` is absent or
 * `startingStock` is zero/garbage (no divisor) so callers persist null, not 0.
 */
export function computeAdjustmentMoneyShare(
  total: string | null,
  startingStock: string,
  quantity: string,
): string | null {
  if (total == null || total.trim() === "") return null
  const starting = parseInventoryDecimal(startingStock)
  if (starting === 0) return null
  const share = (parseInventoryDecimal(total) * parseInventoryDecimal(quantity)) / starting
  if (!Number.isFinite(share)) return null
  const normalized = normalizeAdjustmentMoneyAmount(share)
  return normalized === "" ? null : normalized
}

export function computeInventoryBalance(input: {
  startingStock: string
  netDeducted: string
}): number {
  const starting = parseInventoryDecimal(input.startingStock)
  const netDeducted = parseInventoryDecimal(input.netDeducted)
  const balance = starting - netDeducted
  return balance < 0 ? 0 : balance
}

/** The scalar inputs a conversion formula contributes to `convertQuantity`. */
export type ConversionFormulaInput = {
  fromUnitId: string
  operator: "DIVIDE" | "MULTIPLY"
  factorMode: "CONSTANT" | "USE_COVERAGE_PER_UNIT"
  constantFactor: string | null
}

/**
 * Convert a balance into the formula's target unit for display. Returns `""`
 * (blank) — never a misleading number — when there is no formula, when the row's
 * OWN unit does not match the formula's declared source unit (the source-unit
 * guard: a row may point at any formula, so we only convert when they line up),
 * or when the resolved factor is blank/NaN/zero. The factor is the formula's
 * `constantFactor` (CONSTANT, e.g. carpet ×1.333) or the consuming row's own
 * `coveragePerUnit` (USE_COVERAGE_PER_UNIT, e.g. planks ÷ sq-ft-per-box). The
 * converted value and its unit are always DERIVED here — never stored.
 */
export function convertQuantity(input: {
  balance: string
  rowUnitId: string | null
  coveragePerUnit: string | null
  formula: ConversionFormulaInput | null
}): string {
  const { balance, rowUnitId, coveragePerUnit, formula } = input
  if (formula == null) return ""
  if (!rowUnitId || rowUnitId !== formula.fromUnitId) return ""
  const factor =
    formula.factorMode === "CONSTANT"
      ? parseInventoryDecimal(formula.constantFactor ?? "")
      : parseInventoryDecimal(coveragePerUnit ?? "")
  if (!Number.isFinite(factor) || factor === 0) return ""
  const amount = parseInventoryDecimal(balance)
  const converted = formula.operator === "DIVIDE" ? amount / factor : amount * factor
  if (!Number.isFinite(converted)) return ""
  return toInventoryFixedString(converted)
}
