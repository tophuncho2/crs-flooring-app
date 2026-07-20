import { describe, expect, it } from "vitest"
import { formatEasternDate, toIsoTimestamp } from "../../src/shared/date-format.js"

describe("formatEasternDate", () => {
  it("formats a timestamp as an Eastern MM/DD/YYYY date", () => {
    expect(formatEasternDate("2026-04-22T16:00:00.000Z")).toBe("04/22/2026")
  })

  it("pins to America/New_York so a late-UTC time never drifts a day forward", () => {
    // 2026-04-23 02:00Z is still 2026-04-22 (10 PM EDT).
    expect(formatEasternDate("2026-04-23T02:00:00.000Z")).toBe("04/22/2026")
  })

  it("returns an empty string for null / undefined / empty / unparseable input", () => {
    expect(formatEasternDate(null)).toBe("")
    expect(formatEasternDate(undefined)).toBe("")
    expect(formatEasternDate("")).toBe("")
    expect(formatEasternDate("not-a-date")).toBe("")
  })
})

describe("toIsoTimestamp", () => {
  it("serializes a Date to an ISO-8601 string", () => {
    expect(toIsoTimestamp(new Date("2026-07-11T14:30:00.000Z"))).toBe(
      "2026-07-11T14:30:00.000Z",
    )
  })

  it("passes an already-ISO / date string through verbatim (no re-parse)", () => {
    expect(toIsoTimestamp("2026-07-11")).toBe("2026-07-11")
    expect(toIsoTimestamp("2026-07-11T14:30:00.000Z")).toBe("2026-07-11T14:30:00.000Z")
  })

  it("collapses null and undefined to an empty string", () => {
    expect(toIsoTimestamp(null)).toBe("")
    expect(toIsoTimestamp(undefined)).toBe("")
  })

  it("passes an empty string through as empty", () => {
    expect(toIsoTimestamp("")).toBe("")
  })
})
