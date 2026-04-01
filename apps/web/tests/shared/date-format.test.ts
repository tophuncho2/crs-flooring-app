import { describe, expect, it } from "vitest"
import { formatStableDate, formatStableDateTime } from "@/modules/shared/domain/date-format"

describe("stable date formatting", () => {
  it("formats date-only strings in UTC-stable form", () => {
    expect(formatStableDate("2026-03-21")).toBe("3/21/2026")
  })

  it("formats date-times in UTC-stable form", () => {
    expect(formatStableDateTime("2026-03-21T15:45:00.000Z")).toContain("3/21/2026")
  })
})
