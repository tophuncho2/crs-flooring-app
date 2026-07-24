// Sales-tax rate + derived tax-cost math for a template. The rate is a PERCENT
// handled as a canonical scale-3 string ("8.375"); Tax Cost is a derived money
// roll-up (rate × the taxed line totals), computed in integer cents with the same
// half-up BigInt idiom as every other line-total math. Pure — no I/O.
//
// A future state→rate lookup may replace the manual rate entry, but this module
// consumes the rate as a resolved string, so the math is unaffected.

import { normalizeMoneyAmount } from "../shared/money.js"
import { isValidPercent, normalizePercent, PERCENT_MAX, PERCENT_SCALE } from "../shared/percent.js"
import {
  sumTemplatePlannedProductLineTotals,
  type TemplatePlannedProductLineInputs,
} from "./planned-products/math.js"

/** Fractional digits a tax rate carries (percent, e.g. 8.375). */
export const TAX_RATE_SCALE = PERCENT_SCALE
/** Max accepted rate — a percentage over 100 is treated as a typo. */
export const TAX_RATE_MAX = PERCENT_MAX
export const TAX_RATE_INVALID_MESSAGE = "Tax rate must be a percentage between 0 and 100"

/**
 * True when `input` is a well-formed tax rate: non-negative, ≤ TAX_RATE_SCALE
 * decimals, and ≤ TAX_RATE_MAX. Empty string is NOT valid here — callers treat
 * empty as "unset" upstream. Thin wrapper over the shared percent VO.
 */
export function isValidTaxRate(input: string): boolean {
  return isValidPercent(input, TAX_RATE_MAX)
}

/**
 * Canonicalize a tax rate to a fixed-scale-3 string ("8" → "8.000", "8.25" →
 * "8.250"). Empty/garbage → "". The fixed-scale-3-WITH-DOT invariant is
 * LOAD-BEARING: the tax math does `normalizeTaxRate(rate).replace(".", "")` to read
 * the rate as an integer of thousandths-of-a-percent, so an unpadded string would
 * silently mis-scale the tax by 10×. Delegates to the shared percent VO.
 */
export function normalizeTaxRate(input: string): string {
  return normalizePercent(input)
}

/**
 * Derived Tax Cost = taxRate% × the summed pre-tax line totals of the TAXED rows.
 * `taxedLineInputs` is the already-filtered set of taxed rows (both tables), each as
 * { quantity, bidCost } — the same shape the line-total math consumes. Integer-cents,
 * half-up. A blank/invalid rate → "0.00".
 */
export function computeTemplateTaxCost(
  taxedLineInputs: TemplatePlannedProductLineInputs[],
  taxRate: string,
): string {
  const rate = normalizeTaxRate(taxRate)
  if (rate === "") return "0.00"

  const base = sumTemplatePlannedProductLineTotals(taxedLineInputs) // "X.XX"
  const baseCents = BigInt(normalizeMoneyAmount(base).replace(".", ""))
  const milliPercent = BigInt(rate.replace(".", "")) // scale-3 percent → thousandths of a percent

  // tax(cents) = baseCents × milliPercent / (100 × 1000), half-up (all non-negative).
  const taxCents = (baseCents * milliPercent + 50000n) / 100000n
  const dollars = taxCents / 100n
  const cents = (taxCents % 100n).toString().padStart(2, "0")
  return `${dollars.toString()}.${cents}`
}
