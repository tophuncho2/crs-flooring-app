import { describe, expect, it } from "vitest"
import {
  assertNetDeductedWithinStartingStock,
  computeNetDeducted,
  isNetDeductedWithinStartingStock,
  signedDelta,
} from "../../../src/inventory/adjustments/math/net-deducted-math.js"
import { computeLedgerBeforeAfter } from "../../../src/inventory/adjustments/math/ledger-math.js"

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

describe("computeLedgerBeforeAfter", () => {
  it("replays a chain: each before = prior after, after = before − signedDelta", () => {
    const rows = [
      { id: "a", quantity: "10", adjustmentType: "DEDUCTION" as const },
      { id: "b", quantity: "5", adjustmentType: "INCREASE" as const },
      { id: "c", quantity: "20", adjustmentType: "DEDUCTION" as const },
    ]
    expect(computeLedgerBeforeAfter(rows, "100")).toEqual([
      { id: "a", before: "100.00", after: "90.00" }, // 100 − 10
      { id: "b", before: "90.00", after: "95.00" }, // 90 − (−5)
      { id: "c", before: "95.00", after: "75.00" }, // 95 − 20
    ])
  })

  it("editing an earlier row re-flows every later before/after; earlier rows are untouched", () => {
    const base = [
      { id: "a", quantity: "10", adjustmentType: "DEDUCTION" as const },
      { id: "b", quantity: "5", adjustmentType: "DEDUCTION" as const },
      { id: "c", quantity: "5", adjustmentType: "DEDUCTION" as const },
    ]
    const original = computeLedgerBeforeAfter(base, "100")
    expect(original[0]).toEqual({ id: "a", before: "100.00", after: "90.00" })

    // Shrink the FIRST row's deduction 10 → 4 (a +6 swing).
    const edited = computeLedgerBeforeAfter(
      base.map((r) => (r.id === "a" ? { ...r, quantity: "4" } : r)),
      "100",
    )
    // `a.before` is unchanged (it starts the chain); `a.after` rises by 6, and
    // every later row's before/after shifts up by the same 6.
    expect(edited[0]).toEqual({ id: "a", before: "100.00", after: "96.00" })
    expect(edited[1]).toEqual({ id: "b", before: "96.00", after: "91.00" })
    expect(edited[2]).toEqual({ id: "c", before: "91.00", after: "86.00" })
  })

  it("returns an empty array for an empty chain", () => {
    expect(computeLedgerBeforeAfter([], "100")).toEqual([])
  })

  it("treats a non-finite startingStock as 0", () => {
    expect(
      computeLedgerBeforeAfter([{ id: "a", quantity: "5", adjustmentType: "DEDUCTION" }], "x"),
    ).toEqual([{ id: "a", before: "0.00", after: "-5.00" }])
  })
})
