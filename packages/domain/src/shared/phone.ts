// The phone standard. Phone-of-record values are stored as a canonical
// **digits-only** string (US 10-digit; a leading country `1` is dropped) and
// transported as that bare-digit string. This module is the single source of
// truth: every write boundary (validators, data layer) normalizes through
// `normalizePhoneNumber`, every display goes through `formatPhoneNumber`. Pure —
// no Prisma, no React.
//
// Policy is **lenient**: anything that isn't a clean 10-digit number is still
// accepted — we keep whatever digits were given (so extensions / international /
// partial entries survive) and `formatPhoneNumber` falls back to the raw digits
// rather than forcing a shape. Callers never 400 on phone.
//
// Adopt for any future phone column: `String?` in the schema,
// `normalizePhoneNumber` at the validator + data layer, `PhoneCell` in the UI.

/** Digit count of a canonical US phone number. */
export const PHONE_CANONICAL_LENGTH = 10

/** Strip every non-digit from the input. */
function digitsOnly(input: string): string {
  return input.replace(/\D/g, "")
}

/**
 * Canonicalize a phone number to bare digits. US 10-digit is the target: an
 * 11-digit value with a leading country `1` has it dropped (`"1-555-123-4567"`
 * → `"5551234567"`). Anything else keeps whatever digits remain (lenient — no
 * shape is forced), and empty/garbage → `""`. This is the defensive guard so a
 * value that bypasses validation still persists as digits only.
 */
export function normalizePhoneNumber(input: string): string {
  const digits = digitsOnly(input)
  if (digits.length === PHONE_CANONICAL_LENGTH + 1 && digits.startsWith("1")) {
    return digits.slice(1)
  }
  return digits
}

/**
 * True when `input` normalizes to exactly a clean US 10-digit number. Callers
 * that want to branch on validity use this; it is **not** used to reject on
 * save (the standard is lenient). Empty string is not valid.
 */
export function isValidPhoneNumber(input: string): boolean {
  return normalizePhoneNumber(input).length === PHONE_CANONICAL_LENGTH
}

/**
 * Display a phone value as `"(555) 123-4567"` when it is a clean 10-digit
 * number. Non-conforming values (extensions, international, partial) fall back
 * to their normalized digits so nothing is hidden. Empty/garbage → `""` so
 * callers can render their own placeholder (e.g. `"—"`).
 */
export function formatPhoneNumber(value: string): string {
  const digits = normalizePhoneNumber(value)
  if (digits === "") return ""
  if (digits.length !== PHONE_CANONICAL_LENGTH) return digits
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}
