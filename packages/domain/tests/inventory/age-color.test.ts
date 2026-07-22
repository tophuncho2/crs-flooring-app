import { describe, expect, it } from "vitest"
import {
  resolveInventoryAgeColor,
  type InventoryAgeBucket,
} from "../../src/inventory/age-color.js"

const NOW_MS = Date.parse("2026-07-21T00:00:00.000Z")
const DAY_MS = 86_400_000

// Ascending by days — the shape the resolver requires.
const BUCKETS: InventoryAgeBucket[] = [
  { days: 30, color: "GREEN" },
  { days: 60, color: "AMBER" },
  { days: 90, color: "RED" },
]

/** ISO timestamp for a row that is `days` old relative to NOW_MS. */
function agedIso(days: number): string {
  return new Date(NOW_MS - days * DAY_MS).toISOString()
}

describe("resolveInventoryAgeColor (ceiling / up-to)", () => {
  it("colors a brand-new row with the youngest threshold's color", () => {
    expect(resolveInventoryAgeColor(agedIso(0), NOW_MS, BUCKETS)).toBe("GREEN")
    expect(resolveInventoryAgeColor(agedIso(5), NOW_MS, BUCKETS)).toBe("GREEN")
    expect(resolveInventoryAgeColor(agedIso(29), NOW_MS, BUCKETS)).toBe("GREEN")
  })

  it("picks the smallest threshold whose days >= age", () => {
    expect(resolveInventoryAgeColor(agedIso(31), NOW_MS, BUCKETS)).toBe("AMBER")
    expect(resolveInventoryAgeColor(agedIso(45), NOW_MS, BUCKETS)).toBe("AMBER")
    expect(resolveInventoryAgeColor(agedIso(75), NOW_MS, BUCKETS)).toBe("RED")
  })

  it("treats the boundary as inclusive (days >= age)", () => {
    expect(resolveInventoryAgeColor(agedIso(30), NOW_MS, BUCKETS)).toBe("GREEN")
    expect(resolveInventoryAgeColor(agedIso(60), NOW_MS, BUCKETS)).toBe("AMBER")
    expect(resolveInventoryAgeColor(agedIso(90), NOW_MS, BUCKETS)).toBe("RED")
  })

  it("returns null for a row older than the largest threshold (open gap)", () => {
    expect(resolveInventoryAgeColor(agedIso(91), NOW_MS, BUCKETS)).toBeNull()
    expect(resolveInventoryAgeColor(agedIso(200), NOW_MS, BUCKETS)).toBeNull()
  })

  it("returns null for a null/undefined/unparseable timestamp", () => {
    expect(resolveInventoryAgeColor(null, NOW_MS, BUCKETS)).toBeNull()
    expect(resolveInventoryAgeColor(undefined, NOW_MS, BUCKETS)).toBeNull()
    expect(resolveInventoryAgeColor("not-a-date", NOW_MS, BUCKETS)).toBeNull()
  })

  it("returns null when there are no thresholds", () => {
    expect(resolveInventoryAgeColor(agedIso(5), NOW_MS, [])).toBeNull()
  })

  it("returns null for a future timestamp (negative age)", () => {
    expect(resolveInventoryAgeColor(agedIso(-10), NOW_MS, BUCKETS)).toBeNull()
  })
})
