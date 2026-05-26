import { describe, expect, it } from "vitest"
import {
  assertCutSumWithinStartingStock,
  computeTotalCutSum,
  isCutSumWithinStartingStock,
} from "../../../../src/flooring/inventory/cut-logs/math/cut-sum-math.js"
import { computeBeforeAfterForFinalize } from "../../../../src/flooring/inventory/cut-logs/math/finalize-math.js"
import { deriveCutLogCoverageCutString } from "../../../../src/flooring/inventory/cut-logs/math/category-math.js"

describe("computeTotalCutSum", () => {
  it("sums non-void cuts to two decimals", () => {
    expect(
      computeTotalCutSum([
        { cut: "5", void: false },
        { cut: "3.25", void: false },
      ]),
    ).toBe("8.25")
  })

  it("skips void rows, null cuts, and non-finite values", () => {
    expect(
      computeTotalCutSum([
        { cut: "5", void: false },
        { cut: "99", void: true },
        { cut: null, void: false },
        { cut: "abc", void: false },
      ]),
    ).toBe("5.00")
  })

  it("returns 0.00 for an empty set", () => {
    expect(computeTotalCutSum([])).toBe("0.00")
  })
})

describe("assertCutSumWithinStartingStock", () => {
  it("passes when the sum is under or equal to stock", () => {
    expect(() =>
      assertCutSumWithinStartingStock({ totalCutSum: "5", startingStock: "10" }),
    ).not.toThrow()
    expect(() =>
      assertCutSumWithinStartingStock({ totalCutSum: "10", startingStock: "10" }),
    ).not.toThrow()
  })

  it("throws when the sum exceeds stock or input is non-finite", () => {
    expect(() =>
      assertCutSumWithinStartingStock({ totalCutSum: "11", startingStock: "10" }),
    ).toThrow("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK")
    expect(() =>
      assertCutSumWithinStartingStock({ totalCutSum: "x", startingStock: "10" }),
    ).toThrow("CUT_LOG_TOTALCUTSUM_EXCEEDS_STARTING_STOCK")
  })
})

describe("isCutSumWithinStartingStock", () => {
  it("returns booleans without throwing", () => {
    expect(isCutSumWithinStartingStock({ totalCutSum: "5", startingStock: "10" })).toBe(true)
    expect(isCutSumWithinStartingStock({ totalCutSum: "11", startingStock: "10" })).toBe(false)
    expect(isCutSumWithinStartingStock({ totalCutSum: "x", startingStock: "10" })).toBe(false)
  })
})

describe("computeBeforeAfterForFinalize", () => {
  it("computes before = stock − priorConsumed and after = before − cut", () => {
    expect(
      computeBeforeAfterForFinalize({ startingStock: "100", priorConsumed: "20", cut: "5" }),
    ).toEqual({ before: "80.00", after: "75.00" })
  })

  it("throws on non-finite input", () => {
    expect(() =>
      computeBeforeAfterForFinalize({ startingStock: "x", priorConsumed: "0", cut: "5" }),
    ).toThrow("CUT_LOG_ARITHMETIC_MISMATCH")
  })
})

describe("deriveCutLogCoverageCutString", () => {
  it("multiplies cut by coveragePerUnit for a coverage category", () => {
    expect(
      deriveCutLogCoverageCutString({ cut: "10", coveragePerUnit: "2.5", categorySlug: "vinyl-plank" }),
    ).toBe("25.00")
  })

  it("returns null when coveragePerUnit is null", () => {
    expect(
      deriveCutLogCoverageCutString({ cut: "10", coveragePerUnit: null, categorySlug: "vinyl-plank" }),
    ).toBeNull()
  })

  it("returns null for a category that does not support coverage", () => {
    expect(
      deriveCutLogCoverageCutString({ cut: "10", coveragePerUnit: "2.5", categorySlug: "broadloom" }),
    ).toBeNull()
  })

  it("returns null for a non-finite cut", () => {
    expect(
      deriveCutLogCoverageCutString({ cut: "abc", coveragePerUnit: "2.5", categorySlug: "vinyl-plank" }),
    ).toBeNull()
  })
})
