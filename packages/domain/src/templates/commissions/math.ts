// Commission line math for a template. A commission line total = percent% × the
// template's Net Cost (Σ of all planned-product + service-item line totals). The
// percent is a canonical scale-3 string (thousandths of a percent); the math is
// integer-cents half-up, the same BigInt idiom as the tax math, so it agrees with
// every other money value to the penny. Pure — no I/O.
//
// Net Cost is cross-row (shared by every commission line), so it is passed in — it
// is never a per-row column.

import { normalizeMoneyAmount } from "../../shared/money.js"
import { normalizePercent } from "../../shared/percent.js"

function toCents(value: string): bigint {
  const normalized = normalizeMoneyAmount(value)
  if (normalized === "") return 0n
  return BigInt(normalized.replace(".", ""))
}

function centsToMoney(cents: bigint): string {
  const dollars = cents / 100n
  const remainder = (cents % 100n).toString().padStart(2, "0")
  return `${dollars.toString()}.${remainder}`
}

/**
 * Commission line total = percent% × netCost. Blank percent → "" (unset → the grid
 * renders "—"), mirroring the other grids' all-blank sentinel. Integer-cents,
 * half-up — netCost is a cost (non-negative) so half-up = (n + 50000) / 100000.
 */
export function computeTemplateCommissionLineTotal(percent: string, netCost: string): string {
  const rate = normalizePercent(percent)
  if (rate === "") return ""
  const netCents = toCents(netCost)
  const milliPercent = BigInt(rate.replace(".", "")) // scale-3 percent → thousandths of a percent
  const cents = (netCents * milliPercent + 50000n) / 100000n
  return centsToMoney(cents)
}

/**
 * Section roll-up: Σ of every commission line total against the shared netCost,
 * using the same integer-cents math as the per-line total so the roll-up agrees to
 * the penny. Blank rows contribute nothing; an all-blank list totals "0.00" — a cost
 * roll-up is meaningfully zero.
 */
export function sumTemplateCommissionLineTotals(percents: string[], netCost: string): string {
  let totalCents = 0n
  for (const percent of percents) {
    const lineTotal = computeTemplateCommissionLineTotal(percent, netCost)
    if (lineTotal === "") continue
    totalCents += BigInt(lineTotal.replace(".", ""))
  }
  return centsToMoney(totalCents)
}
