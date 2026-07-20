import { describe, expect, it } from "vitest"
import { toIsoTimestamp } from "../../src/shared/date-format.js"

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
