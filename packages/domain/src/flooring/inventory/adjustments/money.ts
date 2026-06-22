// Adjustment money standard — 3 decimals. Inventory adjustment cost/freight are
// NOT user input: they are computed pro-rata from the parent inventory row
// (`parent × quantity / startingStock`). For accounting accuracy that derived
// share is carried at three fractional digits and stored as
// `@db.Decimal(12, 3)` — one digit finer than the shared 2dp money standard.
//
// This mirrors `shared/money.ts` exactly but at `ADJUSTMENT_MONEY_SCALE = 3`.
// It is deliberately separate so the shared 2dp standard stays untouched. Pure —
// no Prisma, no React, half-up via integer math (never `toFixed`, float-bound).

/** Fractional digits every adjustment money value carries. */
export const ADJUSTMENT_MONEY_SCALE = 3

function toRawString(input: string | number): string {
  return (typeof input === "number" ? String(input) : input).trim()
}

function stripLeadingZeros(digits: string): string {
  const trimmed = digits.replace(/^0+/, "")
  return trimmed === "" ? "0" : trimmed
}

/**
 * Canonicalize a derived adjustment money amount to a fixed-scale-3 string
 * (`"10"` → `"10.000"`, `"10.5"` → `"10.500"`). Empty/garbage → `""` so callers
 * persist `null`. Inputs with more than `ADJUSTMENT_MONEY_SCALE` decimals are
 * rounded **half-up exactly** via integer math (never `toFixed`, which is
 * float-bound) — the share arrives as a JS number from the division, so this is
 * the boundary that strips IEEE-754 drift.
 */
export function normalizeAdjustmentMoneyAmount(input: string | number): string {
  const raw = toRawString(input).replace(/^\+/, "")
  if (raw === "") return ""

  const match = /^(\d+)(?:\.(\d+))?$/.exec(raw)
  if (!match) return ""

  const intPart = match[1]
  const fracPart = match[2] ?? ""

  if (fracPart.length <= ADJUSTMENT_MONEY_SCALE) {
    return `${stripLeadingZeros(intPart)}.${fracPart.padEnd(ADJUSTMENT_MONEY_SCALE, "0")}`
  }

  // More than three decimals: round half-up on the digit string with BigInt.
  const kept = BigInt(intPart + fracPart.slice(0, ADJUSTMENT_MONEY_SCALE))
  const roundUp = fracPart.charCodeAt(ADJUSTMENT_MONEY_SCALE) - 48 >= 5
  const scaled = (roundUp ? kept + 1n : kept)
    .toString()
    .padStart(ADJUSTMENT_MONEY_SCALE + 1, "0")
  const dollars = stripLeadingZeros(scaled.slice(0, -ADJUSTMENT_MONEY_SCALE))
  const cents = scaled.slice(-ADJUSTMENT_MONEY_SCALE)
  return `${dollars}.${cents}`
}
