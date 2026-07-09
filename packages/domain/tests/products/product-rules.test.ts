import { describe, expect, it } from "vitest"
import { validateProductPrimaryForm } from "../../src/products/product-rules.js"

describe("validateProductPrimaryForm", () => {
  const valid = { categoryId: "cat-1", unitId: "u-sf" }

  it("passes with category + unit and no cost", () => {
    expect(validateProductPrimaryForm(valid)).toBe("")
  })

  it("requires category then unit", () => {
    expect(validateProductPrimaryForm({ categoryId: "", unitId: "u-sf" })).toBe(
      "Category is required",
    )
    expect(validateProductPrimaryForm({ categoryId: "cat-1", unitId: "" })).toBe(
      "Unit is required",
    )
  })

  it("allows an empty cost (optional — unset)", () => {
    expect(validateProductPrimaryForm({ ...valid, cost: "" })).toBe("")
    expect(validateProductPrimaryForm({ ...valid, cost: "   " })).toBe("")
  })

  it("accepts a well-formed money cost", () => {
    expect(validateProductPrimaryForm({ ...valid, cost: "5" })).toBe("")
    expect(validateProductPrimaryForm({ ...valid, cost: "5.00" })).toBe("")
    expect(validateProductPrimaryForm({ ...valid, cost: "1234.50" })).toBe("")
  })

  it("rejects a malformed money cost", () => {
    expect(validateProductPrimaryForm({ ...valid, cost: "5.123" })).toBe(
      "Cost is not a valid amount",
    )
    expect(validateProductPrimaryForm({ ...valid, cost: "-5" })).toBe(
      "Cost is not a valid amount",
    )
    expect(validateProductPrimaryForm({ ...valid, cost: "abc" })).toBe(
      "Cost is not a valid amount",
    )
  })
})
