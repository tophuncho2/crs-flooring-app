import { describe, expect, it } from "vitest"
import { validateStagedInventoryFilterForm } from "../../../../src/flooring/imports/staged-inventory-filter-rows/form-rules.js"
import {
  computeFilterRemainingStock,
  EMPTY_STAGED_INVENTORY_FILTER_FORM,
  type StagedInventoryFilterForm,
} from "../../../../src/flooring/imports/staged-inventory-filter-rows/types.js"

function filterForm(
  overrides: Partial<StagedInventoryFilterForm> = {},
): StagedInventoryFilterForm {
  return {
    categoryFilterId: "cat-1",
    productId: "product-1",
    stockOrdered: "10",
    ...overrides,
  }
}

describe("validateStagedInventoryFilterForm — stock ordered is optional", () => {
  it("accepts a blank stock ordered (not yet ordered)", () => {
    const issues = validateStagedInventoryFilterForm(filterForm({ stockOrdered: "" }))
    expect(issues).toEqual([])
  })

  it("accepts whitespace-only stock ordered as blank", () => {
    const issues = validateStagedInventoryFilterForm(filterForm({ stockOrdered: "  " }))
    expect(issues).toEqual([])
  })

  it("treats the empty form constant as valid once a product is chosen", () => {
    const issues = validateStagedInventoryFilterForm({
      ...EMPTY_STAGED_INVENTORY_FILTER_FORM,
      productId: "product-1",
    })
    expect(issues).toEqual([])
  })

  it("still rejects a non-numeric value when present", () => {
    const issues = validateStagedInventoryFilterForm(filterForm({ stockOrdered: "abc" }))
    expect(issues).toContainEqual({ code: "FILTER_STOCK_ORDERED_INVALID", value: "abc" })
  })

  it("still rejects a negative value when present", () => {
    const issues = validateStagedInventoryFilterForm(filterForm({ stockOrdered: "-5" }))
    expect(issues).toContainEqual({ code: "FILTER_STOCK_ORDERED_NEGATIVE", value: "-5" })
  })

  it("still requires a product", () => {
    const issues = validateStagedInventoryFilterForm(filterForm({ productId: "" }))
    expect(issues).toContainEqual({ code: "FILTER_PRODUCT_REQUIRED" })
  })
})

describe("computeFilterRemainingStock — blank stock ordered", () => {
  it("returns blank when stock ordered is unset", () => {
    expect(
      computeFilterRemainingStock({ stockOrdered: "", childStartingStockSum: "4" }),
    ).toBe("")
  })

  it("returns blank for whitespace-only stock ordered", () => {
    expect(
      computeFilterRemainingStock({ stockOrdered: "  ", childStartingStockSum: "4" }),
    ).toBe("")
  })

  it("computes ordered minus child starting stock when present", () => {
    expect(
      computeFilterRemainingStock({ stockOrdered: "10", childStartingStockSum: "4" }),
    ).toBe("6.00")
  })
})
