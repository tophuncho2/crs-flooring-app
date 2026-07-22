import type { PaletteColor } from "../shared/palette.js"

/** One age-indicator threshold: a day count paired with its palette color. */
export type InventoryAgeBucket = { days: number; color: PaletteColor }

const MS_PER_DAY = 86_400_000

/**
 * Ceiling ("up-to") bucketing for an inventory row's date cell. Given a
 * timestamp and the set of age-indicator thresholds sorted ASCENDING by `days`,
 * return the color of the SMALLEST threshold whose `days >= ageInDays` (age =
 * whole days between `nowMs` and the timestamp). Each threshold reads as "until
 * a row is this many days old, it is this color" — so a brand-new (age 0) row
 * takes the youngest threshold's color.
 *
 * Returns `null` when there is no timestamp, the timestamp is unparseable, the
 * age is negative, the age exceeds the largest threshold (older than every band
 * — the open gap stays uncolored by design), or the set is empty. Pure —
 * `nowMs` is injected so the data layer owns the clock (per the @builders/db →
 * pure-domain carve-out).
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

  for (const bucket of sortedBucketsAsc) {
    if (bucket.days >= ageInDays) return bucket.color
  }
  return null
}
