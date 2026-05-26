/**
 * Normalizes a list-filter array of US state codes: trims, upper-cases, keeps
 * only valid 2-letter codes, and de-duplicates. Returns `undefined` when the
 * input is absent/empty or nothing survives validation, so callers can drop the
 * filter entirely.
 *
 * Distinct from `normalizeAddressState` (single-value, strips non-alpha and
 * slices to 2 chars) in `./address` — this validates each entry and discards
 * anything that is not exactly two letters.
 */
export function normalizeStateCodeFilter(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(
      raw
        .map((entry) => entry.trim().toUpperCase())
        .filter((entry) => /^[A-Z]{2}$/.test(entry)),
    ),
  )
  return cleaned.length > 0 ? cleaned : undefined
}
