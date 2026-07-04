import { describe, expect, it } from "vitest"
import { compareAdjustmentsByRecency } from "../../../src/inventory/adjustments/adjustment-sort.js"

const row = (createdAt: string, id: string) => ({ createdAt, id })

describe("compareAdjustmentsByRecency", () => {
  it("sorts the newer createdAt first (descending)", () => {
    expect(
      compareAdjustmentsByRecency(row("2026-01-02T00:00:00.000Z", "a"), row("2026-01-01T00:00:00.000Z", "b")),
    ).toBeLessThan(0)
    expect(
      compareAdjustmentsByRecency(row("2026-01-01T00:00:00.000Z", "a"), row("2026-01-02T00:00:00.000Z", "b")),
    ).toBeGreaterThan(0)
  })

  it("falls back to id descending when createdAt is equal", () => {
    const at = "2026-01-01T00:00:00.000Z"
    expect(compareAdjustmentsByRecency(row(at, "b"), row(at, "a"))).toBeLessThan(0)
    expect(compareAdjustmentsByRecency(row(at, "a"), row(at, "b"))).toBeGreaterThan(0)
  })

  it("returns 0 when createdAt and id are identical", () => {
    const r = row("2026-01-01T00:00:00.000Z", "a")
    expect(compareAdjustmentsByRecency(r, { ...r })).toBe(0)
  })

  it("orders a list newest → oldest, id desc as tiebreak", () => {
    const sorted = [
      row("2026-01-01T00:00:00.000Z", "x"),
      row("2026-03-01T00:00:00.000Z", "y"),
      row("2026-02-01T00:00:00.000Z", "m"),
      row("2026-02-01T00:00:00.000Z", "z"),
    ].sort(compareAdjustmentsByRecency)
    expect(sorted.map((r) => r.id)).toEqual(["y", "z", "m", "x"])
  })
})
