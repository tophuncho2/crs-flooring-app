import { formatMoney } from "../shared/money.js"
import type { FlooringInventoryAdjustmentType } from "./adjustments/types.js"

export function parseInventoryDecimal(value: string): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function toInventoryFixedString(value: number): string {
  return value.toFixed(2)
}

export function formatInventoryQuantity(value: string, unitLabel: string): string {
  return `${value} ${unitLabel}`.trim()
}

/** Display sign for an adjustment's quantity: `+` for INCREASE, `−` (U+2212) for DEDUCTION. */
export function adjustmentSign(adjustmentType: FlooringInventoryAdjustmentType): "+" | "−" {
  return adjustmentType === "INCREASE" ? "+" : "−"
}

/** Quantity with its direction sign prefixed, e.g. `+100 sq ft` / `−75 sq ft`. */
export function formatSignedAdjustmentQuantity(
  quantity: string,
  adjustmentType: FlooringInventoryAdjustmentType,
  unitLabel: string,
): string {
  return `${adjustmentSign(adjustmentType)}${formatInventoryQuantity(quantity, unitLabel)}`
}

/**
 * Net signed quantity total for the adjustments pinned-footer rollup — the sum
 * of INCREASE magnitudes minus DEDUCTION magnitudes over the filtered set. Sign
 * matches the per-row chip (`+` / `−` U+2212); no unit label since rows may mix
 * units (the total is a magnitude sum, like the inventory stock total). `0` when
 * increases and deductions balance.
 */
export function formatNetAdjustmentQuantity(net: number): string {
  if (net === 0) return "0"
  return `${net < 0 ? "−" : "+"}${toInventoryFixedString(Math.abs(net))}`
}

/**
 * A money figure (cost/freight) with its adjustment direction sign prefixed,
 * e.g. `+$12.34` / `−$12.34`. Returns `"—"` when the amount is absent so the
 * list cell renders a plain placeholder instead of a signed/tinted chip.
 */
export function formatSignedAdjustmentMoney(
  amount: string | null,
  adjustmentType: FlooringInventoryAdjustmentType,
): string {
  if (amount == null || amount === "") return "—"
  const money = formatMoney(amount)
  if (money === "") return "—"
  return `${adjustmentSign(adjustmentType)}${money}`
}

/**
 * Before → After balance transition, units on both sides, e.g. `100 sq ft → 75 sq ft`
 * (arrow U+2192). Returns `null` when either side is absent (pending/unfinalized rows)
 * so callers can render their own placeholder.
 */
export function formatAdjustmentTransition(
  before: string | null,
  after: string | null,
  unitLabel: string,
): string | null {
  if (before == null || before === "" || after == null || after === "") return null
  return `${formatInventoryQuantity(before, unitLabel)} → ${formatInventoryQuantity(after, unitLabel)}`
}

export function composeRollNumberDisplay(prefix: string, number: string): string {
  const trimmed = number.trim()
  if (trimmed.length === 0) return ""
  return `${prefix}${trimmed}`
}
