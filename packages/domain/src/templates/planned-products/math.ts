// Job-costing line math for a planned product. Pure — the single source of truth
// for the derived line total, shared by the read normalizer (server) and the
// grid cell (live client recompute as the user edits). Integer-cents BigInt math
// (no JS floats) so it agrees exactly with the money standard.
//
// Line total = quantity × unitPrice + tax + freight. Bid cost is NOT part of it
// (that feeds the deferred profit/margin columns). Blank inputs coerce to 0; the
// result is "" only when ALL inputs are blank, so the UI can render "—".

import { normalizeMoneyAmount } from "../../shared/money.js"

// Parse any money/decimal string to integer cents. "" / garbage → 0n. Runs
// through normalizeMoneyAmount first so trailing-zero / half-up handling matches
// every other money value in the system.
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

export type TemplatePlannedProductLineInputs = {
  quantity: string
  unitPrice: string
  tax: string
  freight: string
}

export function computeTemplatePlannedProductLineTotal(
  input: TemplatePlannedProductLineInputs,
): string {
  const allBlank =
    !input.quantity.trim() &&
    !input.unitPrice.trim() &&
    !input.tax.trim() &&
    !input.freight.trim()
  if (allBlank) return ""

  const qtyCents = toCents(input.quantity)
  const priceCents = toCents(input.unitPrice)
  const taxCents = toCents(input.tax)
  const freightCents = toCents(input.freight)

  // qtyCents × priceCents is value × 10000 (each factor is value × 100). Divide by
  // 100 to land on cents (value × 100), rounding half-up — all values are
  // non-negative, so half-up = (n + 50) / 100 under floor division.
  const productCents = (qtyCents * priceCents + 50n) / 100n
  return centsToMoney(productCents + taxCents + freightCents)
}
