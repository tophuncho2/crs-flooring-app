// Shared percent value-object: a percentage handled as a canonical scale-3 string
// ("8.375"). Two consumers today — the template tax rate and the template
// commission rate — so the scale-3 mechanism lives here once rather than being
// copied per-module. Pure — no I/O.
//
// The fixed-scale-3-WITH-DOT invariant is LOAD-BEARING: downstream tax/commission
// math reads the rate as an integer of thousandths-of-a-percent via
// `normalizePercent(rate).replace(".", "")`, so an unpadded string ("8.25" instead
// of "8.250") would silently mis-scale the result by 10×. Unit-tested in
// packages/domain/tests/shared/percent.test.ts.

/** Fractional digits a percent carries (e.g. 8.375). */
export const PERCENT_SCALE = 3

/** Default max accepted percent — a value over 100 is treated as a typo. */
export const PERCENT_MAX = 100

// Non-negative, up to 3 integer digits, up to PERCENT_SCALE fractional digits.
const PERCENT_INPUT_PATTERN = /^\d{1,3}(\.\d{1,3})?$/

function stripLeadingZeros(digits: string): string {
  const trimmed = digits.replace(/^0+/, "")
  return trimmed === "" ? "0" : trimmed
}

/**
 * True when `input` is a well-formed percent: non-negative, ≤ PERCENT_SCALE
 * decimals, and ≤ `max` (default PERCENT_MAX). Empty string is NOT valid here —
 * callers treat empty as "unset" upstream.
 */
export function isValidPercent(input: string, max: number = PERCENT_MAX): boolean {
  const trimmed = input.trim()
  if (!PERCENT_INPUT_PATTERN.test(trimmed)) return false
  return Number(trimmed) <= max
}

/**
 * Canonicalize a percent to a fixed-scale-3 string ("8" → "8.000", "8.25" →
 * "8.250"). Empty/garbage → "". More than PERCENT_SCALE decimals round half-up via
 * integer math. See the module header for why the scale-3-WITH-DOT invariant is
 * load-bearing.
 */
export function normalizePercent(input: string): string {
  const raw = input.trim().replace(/^\+/, "")
  if (raw === "") return ""

  const match = /^(\d+)(?:\.(\d+))?$/.exec(raw)
  if (!match) return ""

  const intPart = match[1]
  const fracPart = match[2] ?? ""

  if (fracPart.length <= PERCENT_SCALE) {
    return `${stripLeadingZeros(intPart)}.${fracPart.padEnd(PERCENT_SCALE, "0")}`
  }

  // More than three decimals: round half-up on the digit string with BigInt.
  const kept = BigInt(intPart + fracPart.slice(0, PERCENT_SCALE))
  const roundUp = fracPart.charCodeAt(PERCENT_SCALE) - 48 >= 5
  const scaled = (roundUp ? kept + 1n : kept).toString().padStart(PERCENT_SCALE + 1, "0")
  const whole = stripLeadingZeros(scaled.slice(0, -PERCENT_SCALE))
  const frac = scaled.slice(-PERCENT_SCALE)
  return `${whole}.${frac}`
}
