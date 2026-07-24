// Job-costing line math for a template line item. Pure — the single source of
// truth for the derived line total, shared by the read normalizer (server) and
// the grid cell (live client recompute as the user edits). Integer-cents BigInt
// math (no JS floats) so it agrees exactly with the money standard.
//
// Line total = quantity × cost. These rows track what a job
// will cost the company, so the cost IS the per-unit basis. For a planned
// product the cost is the live product-cost read-join; for a service item it
// is the manual cost column. Blank inputs coerce to 0; the result is "" only
// when ALL inputs are blank, so the UI can render "—".

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
  cost: string
}

export function computeTemplatePlannedProductLineTotal(
  input: TemplatePlannedProductLineInputs,
): string {
  const allBlank = !input.quantity.trim() && !input.cost.trim()
  if (allBlank) return ""

  const qtyCents = toCents(input.quantity)
  const costCents = toCents(input.cost)

  // qtyCents × costCents is value × 10000 (each factor is value × 100). Divide by
  // 100 to land on cents (value × 100), rounding half-up — all values are
  // non-negative, so half-up = (n + 50) / 100 under floor division.
  const productCents = (qtyCents * costCents + 50n) / 100n
  return centsToMoney(productCents)
}

// Section roll-up: the sum of every line total, using the same integer-cents math
// as the per-line total so the roll-up agrees with the rows to the penny (never a
// JS-float re-sum). Blank rows contribute nothing; an all-blank list totals
// "0.00" — a cost roll-up is meaningfully zero, not "—".
export function sumTemplatePlannedProductLineTotals(
  inputs: TemplatePlannedProductLineInputs[],
): string {
  let totalCents = 0n
  for (const input of inputs) {
    const lineTotal = computeTemplatePlannedProductLineTotal(input)
    if (lineTotal === "") continue
    totalCents += BigInt(lineTotal.replace(".", ""))
  }
  return centsToMoney(totalCents)
}
