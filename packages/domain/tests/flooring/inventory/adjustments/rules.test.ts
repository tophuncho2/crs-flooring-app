import { describe, expect, it } from "vitest"
import {
  assertAdjustmentLinkageRules,
  assertAdjustmentWarehouseMatchesInventory,
  assertBeforeAfterInvariant,
} from "../../../../src/flooring/inventory/adjustments/rules/adjustment-rules.js"
import { assertAdjustmentExpectedUpdatedAtMatches } from "../../../../src/flooring/inventory/adjustments/rules/pending-mutation-rules.js"
import {
  describeAdjustmentPendingFormIssues,
  validateAdjustmentPendingForm,
} from "../../../../src/flooring/inventory/adjustments/rules/form-rules.js"

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

describe("assertAdjustmentLinkageRules — DEDUCTION", () => {
  it("accepts both-null and both-set", () => {
    expect(() =>
      assertAdjustmentLinkageRules({
        adjustmentType: "DEDUCTION",
        workOrderId: null,
        workOrderItemId: null,
      }),
    ).not.toThrow()
    expect(() =>
      assertAdjustmentLinkageRules({
        adjustmentType: "DEDUCTION",
        workOrderId: "wo",
        workOrderItemId: "womi",
      }),
    ).not.toThrow()
  })

  it("rejects a mixed pair", () => {
    expect(() =>
      assertAdjustmentLinkageRules({
        adjustmentType: "DEDUCTION",
        workOrderId: "wo",
        workOrderItemId: null,
      }),
    ).toThrow("INVENTORY_ADJUSTMENT_LINKAGE_ASYMMETRY")
  })
})

describe("assertAdjustmentLinkageRules — INCREASE", () => {
  it("accepts a no-WO, no-waste INCREASE row", () => {
    expect(() =>
      assertAdjustmentLinkageRules({
        adjustmentType: "INCREASE",
        workOrderId: null,
        workOrderItemId: null,
        isWaste: false,
      }),
    ).not.toThrow()
  })

  it("accepts an INCREASE row with a WO link (return-to-stock against a WO)", () => {
    expect(() =>
      assertAdjustmentLinkageRules({
        adjustmentType: "INCREASE",
        workOrderId: "wo",
        workOrderItemId: "womi",
      }),
    ).not.toThrow()
  })

  it("rejects a mixed INCREASE pair (asymmetric link)", () => {
    expect(() =>
      assertAdjustmentLinkageRules({
        adjustmentType: "INCREASE",
        workOrderId: "wo",
        workOrderItemId: null,
      }),
    ).toThrow("INVENTORY_ADJUSTMENT_LINKAGE_ASYMMETRY")
  })

  it("accepts an INCREASE row flagged as waste (waste is orthogonal to direction)", () => {
    expect(() =>
      assertAdjustmentLinkageRules({
        adjustmentType: "INCREASE",
        workOrderId: null,
        workOrderItemId: null,
        isWaste: true,
      }),
    ).not.toThrow()
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

describe("validateAdjustmentPendingForm", () => {
  it("passes a positive quantity", () => {
    expect(
      validateAdjustmentPendingForm({
        adjustmentType: "DEDUCTION",
        quantity: "5",
        isWaste: false,
        notes: "",
      }),
    ).toEqual([])
  })

  it("flags a missing, non-numeric, or non-positive quantity", () => {
    expect(
      validateAdjustmentPendingForm({
        adjustmentType: "DEDUCTION",
        quantity: "  ",
        isWaste: false,
        notes: "",
      }),
    ).toEqual([{ code: "ADJUSTMENT_QUANTITY_REQUIRED" }])
    expect(
      validateAdjustmentPendingForm({
        adjustmentType: "DEDUCTION",
        quantity: "abc",
        isWaste: false,
        notes: "",
      }),
    ).toEqual([{ code: "ADJUSTMENT_QUANTITY_INVALID", value: "abc" }])
    expect(
      validateAdjustmentPendingForm({
        adjustmentType: "DEDUCTION",
        quantity: "0",
        isWaste: false,
        notes: "",
      }),
    ).toEqual([{ code: "ADJUSTMENT_QUANTITY_NOT_POSITIVE", value: "0" }])
  })
})

describe("describeAdjustmentPendingFormIssues", () => {
  it("joins issue messages", () => {
    expect(
      describeAdjustmentPendingFormIssues([{ code: "ADJUSTMENT_QUANTITY_REQUIRED" }]),
    ).toBe("Quantity is required.")
  })
})
