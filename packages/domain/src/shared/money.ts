// The money standard. Currency-of-record values are stored as PostgreSQL
// DECIMAL(precision, 2) and transported as a canonical fixed-scale **string**
// with exactly two fractional digits — never a JS float (avoids IEEE-754
// drift). This module is the single source of truth: every write boundary
// (validators, data layer) and the money cell normalize through `normalizeMoneyAmount`,
// every display goes through `formatMoney`. Pure — no Prisma, no React.
//
// Adopt for any future currency column: `@db.Decimal(12, 2)` in the schema,
// `normalizeMoneyAmount` at the validator + data layer, `MoneyCell` in the UI.

/** Fractional digits every money value carries. */
export const MONEY_SCALE = 2
/** Total significant digits (matches `@db.Decimal(12, 2)`). */
export const MONEY_PRECISION = 12
/** Max integer digits left of the decimal point. */
export const MONEY_MAX_INTEGER_DIGITS = MONEY_PRECISION - MONEY_SCALE
/** Accepted raw input: non-negative, up to `MONEY_SCALE` fractional digits. */
export const MONEY_INPUT_PATTERN = /^\d+(\.\d{1,2})?$/

function toRawString(input: string | number): string {
  return (typeof input === "number" ? String(input) : input).trim()
}

function stripLeadingZeros(digits: string): string {
  const trimmed = digits.replace(/^0+/, "")
  return trimmed === "" ? "0" : trimmed
}

/**
 * True when `input` is a well-formed money amount: non-negative, at most
 * `MONEY_SCALE` decimals, and within `MONEY_MAX_INTEGER_DIGITS` integer digits.
 * Empty string is **not** valid here — callers treat empty as "absent" upstream.
 */
export function isValidMoneyAmount(input: string): boolean {
  const trimmed = input.trim()
  if (!MONEY_INPUT_PATTERN.test(trimmed)) return false
  const [intPart] = trimmed.split(".")
  return stripLeadingZeros(intPart).length <= MONEY_MAX_INTEGER_DIGITS
}

/**
 * Canonicalize any amount to a fixed-scale-2 string (`"10"` → `"10.00"`,
 * `"10.5"` → `"10.50"`). Empty/garbage → `""`. Inputs with more than
 * `MONEY_SCALE` decimals are rounded **half-up exactly** via integer math
 * (never `toFixed`, which is float-bound) — this is the defensive guard so a
 * value that bypasses validation still persists with exactly two decimals.
 */
export function normalizeMoneyAmount(input: string | number): string {
  const raw = toRawString(input).replace(/^\+/, "")
  if (raw === "") return ""

  const match = /^(\d+)(?:\.(\d+))?$/.exec(raw)
  if (!match) return ""

  const intPart = match[1]
  const fracPart = match[2] ?? ""

  if (fracPart.length <= MONEY_SCALE) {
    return `${stripLeadingZeros(intPart)}.${fracPart.padEnd(MONEY_SCALE, "0")}`
  }

  // More than two decimals: round half-up on the digit string with BigInt.
  const kept = BigInt(intPart + fracPart.slice(0, MONEY_SCALE))
  const roundUp = fracPart.charCodeAt(MONEY_SCALE) - 48 >= 5
  const scaled = (roundUp ? kept + 1n : kept).toString().padStart(MONEY_SCALE + 1, "0")
  const dollars = stripLeadingZeros(scaled.slice(0, -MONEY_SCALE))
  const cents = scaled.slice(-MONEY_SCALE)
  return `${dollars}.${cents}`
}

/**
 * Display a money value as `"$X.XX"` (prefix configurable). Empty/garbage → `""`
 * so callers can render their own placeholder (e.g. `"—"`).
 */
export function formatMoney(value: string | number, options?: { prefix?: string }): string {
  const normalized = normalizeMoneyAmount(value)
  if (normalized === "") return ""
  return `${options?.prefix ?? "$"}${normalized}`
}
