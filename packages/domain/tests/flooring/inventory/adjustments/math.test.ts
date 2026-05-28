import { describe, expect, it } from "vitest"
import {
  assertNetDeductedWithinStartingStock,
  computeNetDeducted,
  isNetDeductedWithinStartingStock,
  signedDelta,
} from "../../../../src/flooring/inventory/adjustments/math/net-deducted-math.js"
import { computeBeforeAfterForFinalize } from "../../../../src/flooring/inventory/adjustments/math/finalize-math.js"
import { deriveAdjustmentCoverageString } from "../../../../src/flooring/inventory/adjustments/math/category-math.js"

describe("signedDelta", () => {
  it("returns +quantity for a DEDUCTION row", () => {
    expect(signedDelta({ quantity: "5", adjustmentType: "DEDUCTION" })).toBe(5)
  })

  it("returns -quantity for an INCREASE row", () => {
    expect(signedDelta({ quantity: "5", adjustmentType: "INCREASE" })).toBe(-5)
  })

  it("returns 0 for null or non-finite quantity", () => {
    expect(signedDelta({ quantity: null, adjustmentType: "DEDUCTION" })).toBe(0)
    expect(signedDelta({ quantity: "abc", adjustmentType: "INCREASE" })).toBe(0)
  })
})

describe("computeNetDeducted", () => {
  it("sums DEDUCTIONs as positive and INCREASEs as negative", () => {
    expect(
      computeNetDeducted([
        { quantity: "5", adjustmentType: "DEDUCTION" },
        { quantity: "3.25", adjustmentType: "DEDUCTION" },
      ]),
    ).toBe("8.25")

    // Net = +10 +10 -30 = -10  (balance > startingStock by 10)
    expect(
      computeNetDeducted([
        { quantity: "10", adjustmentType: "DEDUCTION" },
        { quantity: "10", adjustmentType: "DEDUCTION" },
        { quantity: "30", adjustmentType: "INCREASE" },
      ]),
    ).toBe("-10.00")
  })

  it("ignores null cuts and non-finite values", () => {
    expect(
      computeNetDeducted([
        { quantity: "5", adjustmentType: "DEDUCTION" },
        { quantity: null, adjustmentType: "DEDUCTION" },
        { quantity: "abc", adjustmentType: "INCREASE" },
      ]),
    ).toBe("5.00")
  })

  it("returns 0.00 for an empty set", () => {
    expect(computeNetDeducted([])).toBe("0.00")
  })
})

describe("assertNetDeductedWithinStartingStock", () => {
  it("passes when the sum is under or equal to stock", () => {
    expect(() =>
      assertNetDeductedWithinStartingStock({ netDeducted: "5", startingStock: "10" }),
    ).not.toThrow()
    expect(() =>
      assertNetDeductedWithinStartingStock({ netDeducted: "10", startingStock: "10" }),
    ).not.toThrow()
  })

  it("permits a negative netDeducted (balance > startingStock from INCREASE rows)", () => {
    expect(() =>
      assertNetDeductedWithinStartingStock({ netDeducted: "-50", startingStock: "100" }),
    ).not.toThrow()
  })

  it("throws when the sum exceeds stock or input is non-finite", () => {
    expect(() =>
      assertNetDeductedWithinStartingStock({ netDeducted: "11", startingStock: "10" }),
    ).toThrow("INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK")
    expect(() =>
      assertNetDeductedWithinStartingStock({ netDeducted: "x", startingStock: "10" }),
    ).toThrow("INVENTORY_ADJUSTMENT_NET_DEDUCTED_EXCEEDS_STARTING_STOCK")
  })
})

describe("isNetDeductedWithinStartingStock", () => {
  it("returns booleans without throwing", () => {
    expect(isNetDeductedWithinStartingStock({ netDeducted: "5", startingStock: "10" })).toBe(true)
    expect(isNetDeductedWithinStartingStock({ netDeducted: "-50", startingStock: "10" })).toBe(true)
    expect(isNetDeductedWithinStartingStock({ netDeducted: "11", startingStock: "10" })).toBe(false)
    expect(isNetDeductedWithinStartingStock({ netDeducted: "x", startingStock: "10" })).toBe(false)
  })
})

describe("computeBeforeAfterForFinalize", () => {
  it("DEDUCTION row: after < before", () => {
    expect(
      computeBeforeAfterForFinalize({ startingStock: "100", priorNetDeducted: "20", signedDelta: "5" }),
    ).toEqual({ before: "80.00", after: "75.00" })
  })

  it("INCREASE row: after > before (signedDelta is negative)", () => {
    expect(
      computeBeforeAfterForFinalize({
        startingStock: "100",
        priorNetDeducted: "20",
        signedDelta: "-10",
      }),
    ).toEqual({ before: "80.00", after: "90.00" })
  })

  it("throws on non-finite input", () => {
    expect(() =>
      computeBeforeAfterForFinalize({ startingStock: "x", priorNetDeducted: "0", signedDelta: "5" }),
    ).toThrow("INVENTORY_ADJUSTMENT_ARITHMETIC_MISMATCH")
  })
})

describe("deriveAdjustmentCoverageString", () => {
  it("multiplies quantity by coveragePerUnit for a coverage category", () => {
    expect(
      deriveAdjustmentCoverageString({
        quantity: "10",
        coveragePerUnit: "2.5",
        categorySlug: "vinyl-plank",
      }),
    ).toBe("25.00")
  })

  it("returns null when coveragePerUnit is null", () => {
    expect(
      deriveAdjustmentCoverageString({
        quantity: "10",
        coveragePerUnit: null,
        categorySlug: "vinyl-plank",
      }),
    ).toBeNull()
  })

  it("returns null for a category that does not support coverage", () => {
    expect(
      deriveAdjustmentCoverageString({
        quantity: "10",
        coveragePerUnit: "2.5",
        categorySlug: "broadloom",
      }),
    ).toBeNull()
  })

  it("returns null for a non-finite quantity", () => {
    expect(
      deriveAdjustmentCoverageString({
        quantity: "abc",
        coveragePerUnit: "2.5",
        categorySlug: "vinyl-plank",
      }),
    ).toBeNull()
  })
})
