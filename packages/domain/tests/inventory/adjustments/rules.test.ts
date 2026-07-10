import { describe, expect, it } from "vitest"
import {
  assertAdjustmentWarehouseMatchesInventory,
  assertBeforeAfterInvariant,
} from "../../../src/inventory/adjustments/rules/adjustment-rules.js"
import { assertAdjustmentExpectedUpdatedAtMatches } from "../../../src/inventory/adjustments/rules/mutation-rules.js"
import {
  describeAdjustmentFormIssues,
  validateAdjustmentForm,
} from "../../../src/inventory/adjustments/rules/form-rules.js"

describe("assertBeforeAfterInvariant", () => {
  it("passes when before − signedDelta === after (within tolerance)", () => {
    expect(() =>
      assertBeforeAfterInvariant({ before: "10", signedDelta: "3", after: "7" }),
    ).not.toThrow()
  })

  it("passes for an INCREASE row (negative signedDelta inflates after)", () => {
    expect(() =>
      assertBeforeAfterInvariant({ before: "10", signedDelta: "-3", after: "13" }),
    ).not.toThrow()
  })

  it("throws on an arithmetic mismatch", () => {
    expect(() =>
      assertBeforeAfterInvariant({ before: "10", signedDelta: "3", after: "5" }),
    ).toThrow("INVENTORY_ADJUSTMENT_ARITHMETIC_MISMATCH")
  })

  it("throws on non-finite input", () => {
    expect(() =>
      assertBeforeAfterInvariant({ before: "x", signedDelta: "3", after: "7" }),
    ).toThrow("INVENTORY_ADJUSTMENT_ARITHMETIC_MISMATCH")
  })
})

describe("assertAdjustmentWarehouseMatchesInventory", () => {
  it("passes when the warehouses match", () => {
    expect(() =>
      assertAdjustmentWarehouseMatchesInventory({
        adjustmentWarehouseId: "wh-1",
        inventoryWarehouseId: "wh-1",
      }),
    ).not.toThrow()
  })

  it("throws when the adjustment and inventory warehouses differ", () => {
    expect(() =>
      assertAdjustmentWarehouseMatchesInventory({
        adjustmentWarehouseId: "wh-1",
        inventoryWarehouseId: "wh-2",
      }),
    ).toThrow("INVENTORY_ADJUSTMENT_WAREHOUSE_INVENTORY_MISMATCH")
  })
})

describe("assertAdjustmentExpectedUpdatedAtMatches", () => {
  it("passes on an exact match and throws on a mismatch", () => {
    expect(() =>
      assertAdjustmentExpectedUpdatedAtMatches({ rowUpdatedAt: "t1", expected: "t1" }),
    ).not.toThrow()
    expect(() =>
      assertAdjustmentExpectedUpdatedAtMatches({ rowUpdatedAt: "t2", expected: "t1" }),
    ).toThrow("INVENTORY_ADJUSTMENT_STALE_UPDATED_AT")
  })
})

describe("validateAdjustmentForm", () => {
  it("passes a positive quantity", () => {
    expect(
      validateAdjustmentForm({
        adjustmentType: "DEDUCTION",
        quantity: "5",
        isWaste: false,
        internalNotes: "",
      }),
    ).toEqual([])
  })

  it("flags a missing, non-numeric, or non-positive quantity", () => {
    expect(
      validateAdjustmentForm({
        adjustmentType: "DEDUCTION",
        quantity: "  ",
        isWaste: false,
        internalNotes: "",
      }),
    ).toEqual([{ code: "ADJUSTMENT_QUANTITY_REQUIRED" }])
    expect(
      validateAdjustmentForm({
        adjustmentType: "DEDUCTION",
        quantity: "abc",
        isWaste: false,
        internalNotes: "",
      }),
    ).toEqual([{ code: "ADJUSTMENT_QUANTITY_INVALID", value: "abc" }])
    expect(
      validateAdjustmentForm({
        adjustmentType: "DEDUCTION",
        quantity: "0",
        isWaste: false,
        internalNotes: "",
      }),
    ).toEqual([{ code: "ADJUSTMENT_QUANTITY_NOT_POSITIVE", value: "0" }])
  })
})

describe("describeAdjustmentFormIssues", () => {
  it("joins issue messages", () => {
    expect(
      describeAdjustmentFormIssues([{ code: "ADJUSTMENT_QUANTITY_REQUIRED" }]),
    ).toBe("Quantity is required.")
  })
})
