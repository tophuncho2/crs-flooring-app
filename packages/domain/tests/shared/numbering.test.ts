import { describe, expect, it } from "vitest"
import { computeNextNumber } from "../../src/shared/numbering.js"

describe("computeNextNumber", () => {
  it("starts at 1 when no numbers exist", () => {
    expect(computeNextNumber([])).toBe(1)
  })

  it("returns one past the max for a contiguous run", () => {
    expect(computeNextNumber([1, 2, 3])).toBe(4)
  })

  it("returns one past the max even when there are gaps", () => {
    expect(computeNextNumber([1, 5, 2])).toBe(6)
  })

  it("ignores ordering of the input", () => {
    expect(computeNextNumber([9, 3, 7])).toBe(10)
  })
})
