import { describe, expect, it } from "vitest"
import { normalizeTemplatePlannedProduct } from "../../src/templates/planned-products/normalizers.js"
import { validateTemplatePlannedProductForm } from "../../src/templates/planned-products/rules.js"
import {
  computePlannedProductSubtotal,
  solvePlannedProductMargin,
  normalizeMarginPercent,
  isValidMarginPercent,
} from "../../src/templates/planned-products/math.js"

describe("normalizeTemplatePlannedProduct", () => {
  const base = {
    id: "plan-1",
    productId: "prod-1",
    // `cost` is now a LIVE read-join off the product (10.5 → canonical "10.50").
    product: {
      name: "Oak Plank",
      cost: { toString: () => "10.5" } as { toString(): string },
      category: { name: "Hardwood" },
    },
    quantity: { toString: () => "10" } as { toString(): string },
    unitId: "unit-1",
    unit: { name: "Square Foot", abbreviation: "sqft" },
    notes: "rush",
    // Prisma Decimal.toString() drops trailing zeros ("30"); normalizer canonicalizes.
    estimatedGrossProfitMargin: { toString: () => "30" } as { toString(): string },
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-08T00:00:00.000Z",
    createdBy: "creator@example.com",
    updatedBy: "editor@example.com",
  }

  it("derives product/category/unit display + live cost + margin + subtotal", () => {
    const row = normalizeTemplatePlannedProduct(base)
    expect(row.productName).toBe("Oak Plank")
    expect(row.categoryName).toBe("Hardwood")
    expect(row.unitName).toBe("Square Foot")
    expect(row.unitAbbrev).toBe("sqft")
    expect(row.quantity).toBe("10")
    // Live product cost, canonicalized (the round-trip trap guard).
    expect(row.productCost).toBe("10.50")
    expect(row.estimatedGrossProfitMargin).toBe("30.00")
    // subtotal = 10 × 10.50 ÷ (1 − 0.30) = 105 / 0.70 = 150.00
    expect(row.subtotal).toBe("150.00")
  })

  it("coalesces missing quantity/unit/notes/cost/margin to empty; blanks the subtotal", () => {
    const row = normalizeTemplatePlannedProduct({
      ...base,
      quantity: null,
      unitId: null,
      unit: null,
      notes: null,
      estimatedGrossProfitMargin: null,
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
    expect(row.estimatedGrossProfitMargin).toBe("")
    // No cost + no quantity → nothing to compute.
    expect(row.subtotal).toBe("")
    expect(row.createdBy).toBeNull()
  })

  it("treats a blank margin as 0% (subtotal falls back to extended cost)", () => {
    const row = normalizeTemplatePlannedProduct({ ...base, estimatedGrossProfitMargin: null })
    // 10 × 10.50 ÷ (1 − 0) = 105.00
    expect(row.subtotal).toBe("105.00")
  })
})

describe("planned-product pricing math", () => {
  it("computes the GPM subtotal (qty·cost ÷ (1 − m))", () => {
    expect(computePlannedProductSubtotal({ quantity: "10", cost: "1.50", margin: "30" })).toBe("21.43")
    expect(computePlannedProductSubtotal({ quantity: "10", cost: "1.50", margin: "" })).toBe("15.00")
  })

  it("returns blank when cost or quantity is unset, or margin ≥ 100", () => {
    expect(computePlannedProductSubtotal({ quantity: "10", cost: "", margin: "30" })).toBe("")
    expect(computePlannedProductSubtotal({ quantity: "", cost: "1.50", margin: "30" })).toBe("")
    expect(computePlannedProductSubtotal({ quantity: "10", cost: "1.50", margin: "100" })).toBe("")
  })

  it("back-solves the margin from an edited subtotal (round-trips the compute)", () => {
    expect(solvePlannedProductMargin({ quantity: "10", cost: "1.50", subtotal: "21.43" })).toBe("30.00")
    expect(solvePlannedProductMargin({ quantity: "10", cost: "10.50", subtotal: "150.00" })).toBe("30.00")
  })

  it("back-solve is blank when the extended cost or subtotal is non-positive", () => {
    expect(solvePlannedProductMargin({ quantity: "10", cost: "", subtotal: "50" })).toBe("")
    expect(solvePlannedProductMargin({ quantity: "10", cost: "1.50", subtotal: "0" })).toBe("")
  })

  it("normalizes margin percents to fixed scale 2, sign-preserving", () => {
    expect(normalizeMarginPercent("30")).toBe("30.00")
    expect(normalizeMarginPercent("30.5")).toBe("30.50")
    expect(normalizeMarginPercent("-20")).toBe("-20.00")
    expect(normalizeMarginPercent("")).toBe("")
  })

  it("validates margin: finite and below 100 (negatives allowed)", () => {
    expect(isValidMarginPercent("30")).toBe(true)
    expect(isValidMarginPercent("-15")).toBe(true)
    expect(isValidMarginPercent("100")).toBe(false)
    expect(isValidMarginPercent("abc")).toBe(false)
  })
})

describe("validateTemplatePlannedProductForm", () => {
  const form = { productId: "prod-1", unitId: "", quantity: "", notes: "", estimatedGrossProfitMargin: "" }

  it("requires a product", () => {
    expect(validateTemplatePlannedProductForm({ ...form, productId: "" })).toBe("Product is required")
  })

  it("treats a blank quantity as unset (valid)", () => {
    expect(validateTemplatePlannedProductForm({ ...form, quantity: "" })).toBe("")
  })

  it("rejects a non-positive quantity when provided", () => {
    expect(validateTemplatePlannedProductForm({ ...form, quantity: "0" })).toMatch(/greater than zero/)
  })

  it("treats a blank margin as unset (valid)", () => {
    expect(validateTemplatePlannedProductForm({ ...form, estimatedGrossProfitMargin: "" })).toBe("")
  })

  it("accepts a valid margin (incl. negative = loss)", () => {
    expect(validateTemplatePlannedProductForm({ ...form, estimatedGrossProfitMargin: "30" })).toBe("")
    expect(validateTemplatePlannedProductForm({ ...form, estimatedGrossProfitMargin: "-10" })).toBe("")
  })

  it("rejects a margin at/above 100 or non-numeric", () => {
    expect(validateTemplatePlannedProductForm({ ...form, estimatedGrossProfitMargin: "100" })).toMatch(/below 100/)
    expect(validateTemplatePlannedProductForm({ ...form, estimatedGrossProfitMargin: "abc" })).toMatch(/below 100/)
  })
})
