import { describe, expect, it } from "vitest"
import { normalizeTemplateInvoiceProduct } from "../../src/templates/invoice-products/normalizers.js"
import { validateTemplateInvoiceProductForm } from "../../src/templates/invoice-products/rules.js"

describe("normalizeTemplateInvoiceProduct", () => {
  const base = {
    id: "inv-1",
    productId: "prod-1",
    product: { name: "Oak Plank", category: { name: "Hardwood" } },
    quantity: { toString: () => "12.50" } as { toString(): string },
    unitId: "unit-1",
    unit: { name: "Square Foot", abbreviation: "sqft" },
    notes: "rush",
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    createdBy: "creator@example.com",
    updatedBy: "editor@example.com",
  }

  it("derives product/category/unit display from the joins", () => {
    const row = normalizeTemplateInvoiceProduct(base)
    expect(row.productName).toBe("Oak Plank")
    expect(row.categoryName).toBe("Hardwood")
    expect(row.unitName).toBe("Square Foot")
    expect(row.unitAbbrev).toBe("sqft")
    expect(row.quantity).toBe("12.50")
  })

  it("coalesces missing quantity/unit/notes/actors to empty/null", () => {
    const row = normalizeTemplateInvoiceProduct({
      ...base,
      quantity: null,
      unitId: null,
      unit: null,
      notes: null,
      product: { name: "Oak Plank" },
      createdBy: null,
      updatedBy: null,
    })
    expect(row.quantity).toBe("")
    expect(row.unitId).toBe("")
    expect(row.unitName).toBe("")
    expect(row.unitAbbrev).toBe("")
    expect(row.categoryName).toBe("")
    expect(row.notes).toBe("")
    expect(row.createdBy).toBeNull()
    expect(row.updatedBy).toBeNull()
  })
})

describe("validateTemplateInvoiceProductForm", () => {
  const form = { productId: "prod-1", unitId: "", quantity: "", notes: "" }

  it("requires a product", () => {
    expect(validateTemplateInvoiceProductForm({ ...form, productId: "" })).toBe("Product is required")
  })

  it("treats a blank quantity as unset (valid)", () => {
    expect(validateTemplateInvoiceProductForm({ ...form, quantity: "" })).toBe("")
  })

  it("rejects a non-positive quantity when provided", () => {
    expect(validateTemplateInvoiceProductForm({ ...form, quantity: "0" })).toMatch(/greater than zero/)
    expect(validateTemplateInvoiceProductForm({ ...form, quantity: "-3" })).toMatch(/greater than zero/)
  })

  it("accepts a positive quantity", () => {
    expect(validateTemplateInvoiceProductForm({ ...form, quantity: "4.5" })).toBe("")
  })
})
