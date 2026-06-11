import { describe, expect, it } from "vitest"
import {
  MERGE_MIN_SOURCES,
  assertMergeSources,
  assertMergeSourcesEligible,
  sumMergedStartingStock,
  type MergeSourceRow,
} from "../../../src/flooring/inventory/merge-rules.js"
import { InventoryDomainError } from "../../../src/flooring/inventory/errors.js"

function source(overrides: Partial<MergeSourceRow> = {}): MergeSourceRow {
  return {
    id: "inv-1",
    productId: "p-1",
    startingStock: "100",
    netDeducted: "0",
    wasMerged: false,
    ...overrides,
  }
}

describe("sumMergedStartingStock", () => {
  it("sums each row's remaining balance (starting − deducted) to 2 decimals", () => {
    const total = sumMergedStartingStock([
      source({ id: "a", startingStock: "100", netDeducted: "25" }),
      source({ id: "b", startingStock: "50.5", netDeducted: "0.25" }),
    ])
    // (100 − 25) + (50.5 − 0.25) = 75 + 50.25 = 125.25
    expect(total).toBe("125.25")
  })

  it("clamps a per-row negative balance to 0 (never lets one row subtract from the total)", () => {
    const total = sumMergedStartingStock([
      source({ id: "a", startingStock: "10", netDeducted: "999" }),
      source({ id: "b", startingStock: "40", netDeducted: "0" }),
    ])
    // max(10 − 999, 0) + 40 = 0 + 40 = 40
    expect(total).toBe("40.00")
  })
})

describe("assertMergeSources", () => {
  it("passes for ≥2 rows that all share the product", () => {
    expect(() =>
      assertMergeSources(
        [source({ id: "a" }), source({ id: "b" })],
        "p-1",
      ),
    ).not.toThrow()
  })

  it(`throws INVENTORY_MERGE_TOO_FEW_SOURCES for fewer than ${MERGE_MIN_SOURCES} rows`, () => {
    try {
      assertMergeSources([source({ id: "a" })], "p-1")
      expect.fail("Expected throw")
    } catch (error) {
      if (!(error instanceof InventoryDomainError)) throw error
      expect(error.code).toBe("INVENTORY_MERGE_TOO_FEW_SOURCES")
    }
  })

  it("throws INVENTORY_MERGE_CROSS_PRODUCT when any row belongs to another product", () => {
    try {
      assertMergeSources(
        [source({ id: "a", productId: "p-1" }), source({ id: "b", productId: "p-2" })],
        "p-1",
      )
      expect.fail("Expected throw")
    } catch (error) {
      if (!(error instanceof InventoryDomainError)) throw error
      expect(error.code).toBe("INVENTORY_MERGE_CROSS_PRODUCT")
    }
  })
})

describe("assertMergeSourcesEligible", () => {
  it("passes when every row has remaining balance and none was already merged", () => {
    expect(() =>
      assertMergeSourcesEligible([
        source({ id: "a", startingStock: "10", netDeducted: "0" }),
        source({ id: "b", startingStock: "5", netDeducted: "2" }),
      ]),
    ).not.toThrow()
  })

  it("throws INVENTORY_MERGE_ZERO_BALANCE_SOURCE when a row has exactly zero balance", () => {
    try {
      assertMergeSourcesEligible([
        source({ id: "a", startingStock: "10", netDeducted: "10" }),
        source({ id: "b", startingStock: "40", netDeducted: "0" }),
      ])
      expect.fail("Expected throw")
    } catch (error) {
      if (!(error instanceof InventoryDomainError)) throw error
      expect(error.code).toBe("INVENTORY_MERGE_ZERO_BALANCE_SOURCE")
    }
  })

  it("throws INVENTORY_MERGE_ZERO_BALANCE_SOURCE when a row is oversold (negative balance clamps to 0)", () => {
    try {
      assertMergeSourcesEligible([
        source({ id: "a", startingStock: "5", netDeducted: "99" }),
        source({ id: "b", startingStock: "40", netDeducted: "0" }),
      ])
      expect.fail("Expected throw")
    } catch (error) {
      if (!(error instanceof InventoryDomainError)) throw error
      expect(error.code).toBe("INVENTORY_MERGE_ZERO_BALANCE_SOURCE")
    }
  })

  it("throws INVENTORY_MERGE_ALREADY_MERGED_SOURCE when a balance-positive row was already merged", () => {
    try {
      assertMergeSourcesEligible([
        source({ id: "a", startingStock: "100", netDeducted: "0", wasMerged: true }),
        source({ id: "b", startingStock: "40", netDeducted: "0" }),
      ])
      expect.fail("Expected throw")
    } catch (error) {
      if (!(error instanceof InventoryDomainError)) throw error
      expect(error.code).toBe("INVENTORY_MERGE_ALREADY_MERGED_SOURCE")
    }
  })
})
