import { describe, expect, it } from "vitest"
import { computeTemplatePlannedProductLineTotal } from "../../src/templates/planned-products/math.js"
import { normalizeTemplatePlannedProduct } from "../../src/templates/planned-products/normalizers.js"
import { validateTemplatePlannedProductForm } from "../../src/templates/planned-products/rules.js"

describe("normalizeTemplatePlannedProduct", () => {
  const base = {
    id: "plan-1",
    productId: "prod-1",
    // `cost` is a LIVE read-join off the product (10.5 → canonical "10.50"). It is
    // the "cost" — the per-unit basis for the line total.
    product: {
      name: "Oak Plank",
      cost: { toString: () => "10.5" } as { toString(): string },
      category: { name: "Hardwood" },
    },
    quantity: { toString: () => "10" } as { toString(): string },
    unitId: "unit-1",
    unit: { name: "Square Foot", abbreviation: "sqft" },
    notes: "rush",
    taxed: true,
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
    // Taxed flag passes straight through.
    expect(row.taxed).toBe(true)
  })

  it("derives the line total off cost", () => {
    const row = normalizeTemplatePlannedProduct(base)
    // 10 × 10.50 (cost) = 105.00
    expect(row.lineTotal).toBe("105.00")
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
    // All inputs blank → blank line total (UI renders "—").
    expect(row.lineTotal).toBe("")
    expect(row.createdBy).toBeNull()
  })
})

describe("validateTemplatePlannedProductForm", () => {
  const form = {
    productId: "prod-1",
    unitId: "",
    quantity: "",
    notes: "",
  }

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

describe("computeTemplatePlannedProductLineTotal", () => {
  it("computes qty × cost", () => {
    expect(
      computeTemplatePlannedProductLineTotal({
        quantity: "10",
        cost: "3.50",
      }),
    ).toBe("35.00")
  })

  it("coerces a blank quantity to zero", () => {
    expect(
      computeTemplatePlannedProductLineTotal({
        quantity: "",
        cost: "3.50",
      }),
    ).toBe("0.00")
  })

  it("returns blank when every input is blank", () => {
    expect(
      computeTemplatePlannedProductLineTotal({ quantity: "", cost: "" }),
    ).toBe("")
  })

  it("rounds the qty × cost product half-up to cents", () => {
    // 0.5 × 0.05 = 0.025 → 0.03 half-up (would be 0.02 under floor). Both factors
    // are valid 2-decimal stored values; the sub-cent lands in the product.
    expect(
      computeTemplatePlannedProductLineTotal({
        quantity: "0.5",
        cost: "0.05",
      }),
    ).toBe("0.03")
  })
})
