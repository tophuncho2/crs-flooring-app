// Pure pricing math for planned products — the single source of truth for the
// gross-profit-margin ⇄ subtotal relationship. Consumed by BOTH the data-layer
// normalizer (read-time subtotal) and the client controller (interactive
// margin ⇄ subtotal editing), so the two can never diverge. No Prisma, no React.
//
// Gross Profit Margin convention: margin m = (price − cost) / price, so
//   subtotal = quantity · cost ÷ (1 − m)      (m = margin% / 100)
// and the inverse (editing subtotal back-solves the margin):
//   m = 1 − (quantity · cost) / subtotal
//
// `cost` is the LIVE product cost (a read-join off `product.cost`), never stored
// on the planned product. `estimatedGrossProfitMargin` is the only persisted
// pricing input; `subtotal` always derives.

import { normalizeMoneyAmount } from "../../shared/money.js"

/** Fractional digits a margin percent carries (mirrors `@db.Decimal(5, 2)`). */
export const MARGIN_PERCENT_SCALE = 2

function parseNumeric(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "" || trimmed === ".") return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

/**
 * A valid margin percent: a finite number strictly below 100 (100% GPM implies
 * infinite price) and within the `Decimal(5, 2)` range. Negative = selling at a
 * loss (allowed). Empty is handled as "unset" by callers, so it is NOT valid here.
 */
export function isValidMarginPercent(input: string): boolean {
  const n = parseNumeric(input)
  if (n === null) return false
  return n < 100 && n > -1000
}

/**
 * Canonicalize a margin percent to a fixed-scale-2 string ("30" → "30.00"),
 * sign-preserving. Empty/garbage → "". Read-time and client both normalize
 * through here, so a saved row never reads back as falsely dirty (Prisma's
 * Decimal.toString() drops trailing zeros).
 */
export function normalizeMarginPercent(input: string | number): string {
  const n = typeof input === "number" ? input : parseNumeric(input)
  if (n === null || !Number.isFinite(n)) return ""
  const sign = n < 0 ? "-" : ""
  const cents = Math.round(Math.abs(n) * 100)
  const whole = Math.floor(cents / 100)
  const frac = cents % 100
  return `${sign}${whole}.${String(frac).padStart(MARGIN_PERCENT_SCALE, "0")}`
}

/**
 * subtotal = quantity · cost ÷ (1 − margin/100), as a canonical money string.
 * Returns "" (blank) when it cannot compute: quantity or cost unset (e.g. the
 * product has no cost), or margin ≥ 100. Blank margin is treated as 0% (no
 * markup), so subtotal falls back to the plain extended cost `quantity · cost`.
 */
export function computePlannedProductSubtotal(input: {
  quantity: string
  cost: string
  margin: string
}): string {
  const quantity = parseNumeric(input.quantity)
  const cost = parseNumeric(input.cost)
  if (quantity === null || cost === null) return ""
  const marginPct = input.margin.trim() === "" ? 0 : parseNumeric(input.margin)
  if (marginPct === null || marginPct >= 100) return ""
  const subtotal = (quantity * cost) / (1 - marginPct / 100)
  if (!Number.isFinite(subtotal) || subtotal < 0) return ""
  return normalizeMoneyAmount(subtotal)
}

/**
 * Back-solve the margin percent from an edited subtotal:
 *   m% = (1 − (quantity · cost) / subtotal) · 100
 * Returns "" when it cannot solve: quantity/cost/subtotal unset, or the extended
 * cost or subtotal is non-positive. The result is always < 100 by construction
 * (can be negative = loss).
 */
export function solvePlannedProductMargin(input: {
  quantity: string
  cost: string
  subtotal: string
}): string {
  const quantity = parseNumeric(input.quantity)
  const cost = parseNumeric(input.cost)
  const subtotal = parseNumeric(input.subtotal)
  if (quantity === null || cost === null || subtotal === null) return ""
  const base = quantity * cost
  if (base <= 0 || subtotal <= 0) return ""
  return normalizeMarginPercent((1 - base / subtotal) * 100)
}
