import type { PaletteColor } from "../shared/palette.js"

/** One age-indicator threshold: a day count paired with its palette color. */
export type InventoryAgeBucket = { days: number; color: PaletteColor }

const MS_PER_DAY = 86_400_000

/**
 * Aged-past (floor) bucketing for an inventory row's date cell. Given a
 * timestamp and the set of age-indicator thresholds sorted ASCENDING by `days`,
 * return the color of the LARGEST threshold whose `days <= ageInDays` (age =
 * whole days between `nowMs` and the timestamp).
 *
 * Returns `null` when there is no timestamp, the timestamp is unparseable, the
 * age is negative, no bucket matches (row younger than the smallest threshold),
 * or the set is empty. Pure — `nowMs` is injected so the data layer owns the
 * clock (per the @builders/db → pure-domain carve-out).
 */
export function resolveInventoryAgeColor(
  timestampIso: string | null | undefined,
  nowMs: number,
  sortedBucketsAsc: ReadonlyArray<InventoryAgeBucket>,
): PaletteColor | null {
  if (!timestampIso) return null
  const then = Date.parse(timestampIso)
  if (Number.isNaN(then)) return null
  const ageInDays = Math.floor((nowMs - then) / MS_PER_DAY)
  if (ageInDays < 0) return null

  let match: PaletteColor | null = null
  for (const bucket of sortedBucketsAsc) {
    if (bucket.days <= ageInDays) match = bucket.color
    else break
  }
  return match
}
