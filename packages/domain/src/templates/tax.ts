// Sales-tax rate + derived tax-cost math for a template. The rate is a PERCENT
// handled as a canonical scale-3 string ("8.375"); Tax Cost is a derived money
// roll-up (rate × the taxed line totals), computed in integer cents with the same
// half-up BigInt idiom as every other line-total math. Pure — no I/O.
//
// A future state→rate lookup may replace the manual rate entry, but this module
// consumes the rate as a resolved string, so the math is unaffected.

import { normalizeMoneyAmount } from "../shared/money.js"
import {
  sumTemplatePlannedProductLineTotals,
  type TemplatePlannedProductLineInputs,
} from "./planned-products/math.js"

/** Fractional digits a tax rate carries (percent, e.g. 8.375). */
export const TAX_RATE_SCALE = 3
/** Max accepted rate — a percentage over 100 is treated as a typo. */
export const TAX_RATE_MAX = 100
export const TAX_RATE_INVALID_MESSAGE = "Tax rate must be a percentage between 0 and 100"

// Non-negative, up to 3 integer digits, up to TAX_RATE_SCALE fractional digits.
const TAX_RATE_INPUT_PATTERN = /^\d{1,3}(\.\d{1,3})?$/

function stripLeadingZeros(digits: string): string {
  const trimmed = digits.replace(/^0+/, "")
  return trimmed === "" ? "0" : trimmed
}

/**
 * True when `input` is a well-formed tax rate: non-negative, ≤ TAX_RATE_SCALE
 * decimals, and ≤ TAX_RATE_MAX. Empty string is NOT valid here — callers treat
 * empty as "unset" upstream.
 */
export function isValidTaxRate(input: string): boolean {
  const trimmed = input.trim()
  if (!TAX_RATE_INPUT_PATTERN.test(trimmed)) return false
  return Number(trimmed) <= TAX_RATE_MAX
}

/**
 * Canonicalize a tax rate to a fixed-scale-3 string ("8" → "8.000", "8.25" →
 * "8.250"). Empty/garbage → "". More than TAX_RATE_SCALE decimals round half-up via
 * integer math. The fixed-scale-3-WITH-DOT invariant is LOAD-BEARING: the tax math
 * does `normalizeTaxRate(rate).replace(".", "")` to read the rate as an integer of
 * thousandths-of-a-percent, so an unpadded string ("8.25" instead of "8.250") would
 * silently mis-scale the tax by 10×.
 */
export function normalizeTaxRate(input: string): string {
  const raw = input.trim().replace(/^\+/, "")
  if (raw === "") return ""

  const match = /^(\d+)(?:\.(\d+))?$/.exec(raw)
  if (!match) return ""

  const intPart = match[1]
  const fracPart = match[2] ?? ""

  if (fracPart.length <= TAX_RATE_SCALE) {
    return `${stripLeadingZeros(intPart)}.${fracPart.padEnd(TAX_RATE_SCALE, "0")}`
  }

  // More than three decimals: round half-up on the digit string with BigInt.
  const kept = BigInt(intPart + fracPart.slice(0, TAX_RATE_SCALE))
  const roundUp = fracPart.charCodeAt(TAX_RATE_SCALE) - 48 >= 5
  const scaled = (roundUp ? kept + 1n : kept).toString().padStart(TAX_RATE_SCALE + 1, "0")
  const whole = stripLeadingZeros(scaled.slice(0, -TAX_RATE_SCALE))
  const frac = scaled.slice(-TAX_RATE_SCALE)
  return `${whole}.${frac}`
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
