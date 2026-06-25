/**
 * Normalizes a list-filter array of record ids: trims, drops empties, and
 * de-duplicates while preserving first-seen order. Returns `undefined` when the
 * input is absent/empty or nothing survives, so callers can drop the filter
 * entirely (mirrors `normalizeStateCodeFilter`).
 *
 * Intentionally does not validate id *shape* — ids arrive from our own option
 * pickers, and the where clause simply matches nothing for a bogus id.
 */
export function normalizeIdFilter(
  raw: ReadonlyArray<string> | undefined,
): ReadonlyArray<string> | undefined {
  if (!raw || raw.length === 0) return undefined
  const cleaned = Array.from(
    new Set(raw.map((entry) => entry.trim()).filter((entry) => entry.length > 0)),
  )
  return cleaned.length > 0 ? cleaned : undefined
}
