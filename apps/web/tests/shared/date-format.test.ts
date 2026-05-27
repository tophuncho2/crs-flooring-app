import { describe, expect, it } from "vitest"
import {
  formatEasternDateTime,
  formatStableDate,
  formatStableDateTime,
} from "@builders/domain"

describe("stable date formatting", () => {
  it("formats date-only strings in UTC-stable form", () => {
    expect(formatStableDate("2026-03-21")).toBe("3/21/2026")
  })

  it("formats date-times in UTC-stable form", () => {
    expect(formatStableDateTime("2026-03-21T15:45:00.000Z")).toContain("3/21/2026")
  })
})

describe("formatEasternDateTime", () => {
  it("renders Eastern wall-clock with am/pm and a DST-aware zone suffix", () => {
    // 19:45 UTC = 15:45 EDT (daylight time)
    expect(formatEasternDateTime("2026-05-27T19:45:00.000Z")).toBe(
      "May 27, 2026, 3:45 PM EDT",
    )
    // 20:30 UTC = 15:30 EST (standard time)
    expect(formatEasternDateTime("2026-01-15T20:30:00.000Z")).toBe(
      "Jan 15, 2026, 3:30 PM EST",
    )
  })

  it("returns an empty string for missing or unparseable input", () => {
    expect(formatEasternDateTime(null)).toBe("")
    expect(formatEasternDateTime(undefined)).toBe("")
    expect(formatEasternDateTime("")).toBe("")
    expect(formatEasternDateTime("not-a-date")).toBe("")
  })
})
