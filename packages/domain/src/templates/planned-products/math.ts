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

// Negative-safe cents→money string. centsToMoney assumes non-negative (a negative
// BigInt would emit malformed "-5.-23"), so format the magnitude and re-prefix a
// leading ASCII "-". Used by Line Profit, which can go negative. The ASCII sign is
// what the UI's formatSignedMoney parses; it re-emits the U+2212 display glyph.
function signedCentsToMoney(cents: bigint): string {
  const negative = cents < 0n
  const body = centsToMoney(negative ? -cents : cents)
  return negative ? `-${body}` : body
}

// Format signed tenths-of-a-percent as a one-decimal string ("333" → "33.3",
// "-167" → "−16.7"). Terminal display value — the grid only appends "%", so this
// emits the U+2212 minus glyph directly to match the app's signed-money convention.
function signedTenthsToPercent(tenths: bigint): string {
  const negative = tenths < 0n
  const abs = negative ? -tenths : tenths
  const whole = abs / 10n
  const frac = abs % 10n
  return `${negative ? "−" : ""}${whole.toString()}.${frac.toString()}`
}

export type TemplatePlannedProductLineInputs = {
  quantity: string
  unitPrice: string
  tax: string
  freight: string
}

// Profit/margin need the bid cost on top of the line inputs. bidCost is the row's
// LIVE product cost (a read-join), never a stored planned-product field.
export type TemplatePlannedProductProfitInputs = TemplatePlannedProductLineInputs & {
  bidCost: string
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

// Line profit in integer cents (may be negative). Round each non-negative product
// half-up independently, then subtract, so on-screen profit reconciles exactly
// with shown Line Total − shown Line Cost. Tax + freight are identical in both
// (Line Cost = qty × bidCost + tax + freight) and cancel, so they're not needed.
function lineProfitCents(input: TemplatePlannedProductProfitInputs): bigint {
  const qtyCents = toCents(input.quantity)
  const priceCents = toCents(input.unitPrice)
  const costCents = toCents(input.bidCost)
  const revenueCents = (qtyCents * priceCents + 50n) / 100n
  const costTotalCents = (qtyCents * costCents + 50n) / 100n
  return revenueCents - costTotalCents
}

// Line Profit = Line Total − Line Cost = qty × (unitPrice − bidCost). Returns a
// bare, possibly "-"-prefixed money string ("-5.00" / "12.00"); "" only when qty,
// unitPrice, and bidCost are all blank, so the UI can render "—". The UI formats
// the sign/currency via formatSignedMoney.
export function computeTemplatePlannedProductLineProfit(
  input: TemplatePlannedProductProfitInputs,
): string {
  const allBlank = !input.quantity.trim() && !input.unitPrice.trim() && !input.bidCost.trim()
  if (allBlank) return ""
  return signedCentsToMoney(lineProfitCents(input))
}

// Line Margin = Line Profit ÷ Line Total × 100, as a bare one-decimal percent
// string ("28.6" / "−16.7"; U+2212 for negatives). "" when Line Total is blank or
// zero (divide-by-zero guard) so the UI renders "—".
export function computeTemplatePlannedProductLineMargin(
  input: TemplatePlannedProductProfitInputs,
): string {
  const lineTotal = computeTemplatePlannedProductLineTotal({
    quantity: input.quantity,
    unitPrice: input.unitPrice,
    tax: input.tax,
    freight: input.freight,
  })
  if (lineTotal === "") return ""
  const totalCents = toCents(lineTotal)
  if (totalCents === 0n) return ""

  const profitCents = lineProfitCents(input)
  // Margin in tenths of a percent = 1000 × profit / total, rounded half-away-from-
  // zero. totalCents is always positive here; profitCents may be negative.
  const numerator = profitCents * 1000n
  const quotient = numerator / totalCents // BigInt division truncates toward zero
  const remainder = numerator % totalCents
  const absRemainderDoubled = (remainder < 0n ? -remainder : remainder) * 2n
  const tenths =
    absRemainderDoubled >= totalCents ? quotient + (profitCents < 0n ? -1n : 1n) : quotient
  return signedTenthsToPercent(tenths)
}
