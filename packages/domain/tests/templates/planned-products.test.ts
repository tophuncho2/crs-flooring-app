import { describe, expect, it } from "vitest"
import { normalizeTemplatePlannedProduct } from "../../src/templates/planned-products/normalizers.js"
import { validateTemplatePlannedProductForm } from "../../src/templates/planned-products/rules.js"

describe("normalizeTemplatePlannedProduct", () => {
  const base = {
    id: "plan-1",
    productId: "prod-1",
    // `cost` is a LIVE read-join off the product (10.5 → canonical "10.50").
    product: {
      name: "Oak Plank",
      cost: { toString: () => "10.5" } as { toString(): string },
      category: { name: "Hardwood" },
    },
    quantity: { toString: () => "10" } as { toString(): string },
    unitId: "unit-1",
    unit: { name: "Square Foot", abbreviation: "sqft" },
    notes: "rush",
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-08T00:00:00.000Z",
    createdBy: "creator@example.com",
    updatedBy: "editor@example.com",
  }

  it("derives product/category/unit display + live cost", () => {
    const row = normalizeTemplatePlannedProduct(base)
    expect(row.productName).toBe("Oak Plank")
    expect(row.categoryName).toBe("Hardwood")
    expect(row.unitName).toBe("Square Foot")
    expect(row.unitAbbrev).toBe("sqft")
    expect(row.quantity).toBe("10")
    // Live product cost, canonicalized (the round-trip trap guard).
    expect(row.productCost).toBe("10.50")
  })

  it("coalesces missing quantity/unit/notes/cost to empty", () => {
    const row = normalizeTemplatePlannedProduct({
      ...base,
      quantity: null,
      unitId: null,
      unit: null,
      notes: null,
      product: { name: "Oak Plank", cost: null },
      createdBy: null,
      updatedBy: null,
    })
    expect(row.quantity).toBe("")
    expect(row.unitId).toBe("")
    expect(row.unitName).toBe("")
    expect(row.categoryName).toBe("")
    expect(row.notes).toBe("")
    expect(row.productCost).toBe("")
    expect(row.createdBy).toBeNull()
  })
})

describe("validateTemplatePlannedProductForm", () => {
  const form = { productId: "prod-1", unitId: "", quantity: "", notes: "" }

  it("requires a product", () => {
    expect(validateTemplatePlannedProductForm({ ...form, productId: "" })).toBe("Product is required")
  })

  it("treats a blank quantity as unset (valid)", () => {
    expect(validateTemplatePlannedProductForm({ ...form, quantity: "" })).toBe("")
  })

  it("rejects a non-positive quantity when provided", () => {
    expect(validateTemplatePlannedProductForm({ ...form, quantity: "0" })).toMatch(/greater than zero/)
  })

  it("accepts a valid positive quantity", () => {
    expect(validateTemplatePlannedProductForm({ ...form, quantity: "5" })).toBe("")
  })
})
