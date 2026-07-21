import { describe, expect, it } from "vitest"
import {
  computeTemplatePlannedProductLineMargin,
  computeTemplatePlannedProductLineProfit,
  computeTemplatePlannedProductLineTotal,
} from "../../src/templates/planned-products/math.js"
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
    // Persisted job-costing money columns.
    unitPrice: { toString: () => "3.5" } as { toString(): string },
    tax: { toString: () => "2" } as { toString(): string },
    freight: { toString: () => "5" } as { toString(): string },
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

  it("normalizes the persisted money columns and derives the line total", () => {
    const row = normalizeTemplatePlannedProduct(base)
    expect(row.unitPrice).toBe("3.50")
    expect(row.tax).toBe("2.00")
    expect(row.freight).toBe("5.00")
    // 10 × 3.50 + 2.00 + 5.00 = 42.00
    expect(row.lineTotal).toBe("42.00")
    // Profit = 10 × (3.50 − 10.50) = −70.00 (bid cost exceeds sell price here).
    expect(row.lineProfit).toBe("-70.00")
    // Margin = −70.00 ÷ 42.00 × 100 = −166.7%.
    expect(row.lineMargin).toBe("−166.7")
  })

  it("coalesces missing quantity/unit/notes/cost/money to empty", () => {
    const row = normalizeTemplatePlannedProduct({
      ...base,
      quantity: null,
      unitId: null,
      unit: null,
      notes: null,
      product: { name: "Oak Plank", cost: null },
      unitPrice: null,
      tax: null,
      freight: null,
      createdBy: null,
      updatedBy: null,
    })
    expect(row.quantity).toBe("")
    expect(row.unitId).toBe("")
    expect(row.unitName).toBe("")
    expect(row.categoryName).toBe("")
    expect(row.notes).toBe("")
    expect(row.productCost).toBe("")
    expect(row.unitPrice).toBe("")
    expect(row.tax).toBe("")
    expect(row.freight).toBe("")
    // All inputs blank → blank line total (UI renders "—").
    expect(row.lineTotal).toBe("")
    // Nothing to cost → blank profit + margin too.
    expect(row.lineProfit).toBe("")
    expect(row.lineMargin).toBe("")
    expect(row.createdBy).toBeNull()
  })
})

describe("validateTemplatePlannedProductForm", () => {
  const form = {
    productId: "prod-1",
    unitId: "",
    quantity: "",
    unitPrice: "",
    tax: "",
    freight: "",
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

  it("rejects an invalid money amount in a job-costing field", () => {
    expect(validateTemplatePlannedProductForm({ ...form, unitPrice: "abc" })).toMatch(/Unit price/)
    expect(validateTemplatePlannedProductForm({ ...form, tax: "-1" })).toMatch(/Tax/)
    expect(validateTemplatePlannedProductForm({ ...form, freight: "1.234" })).toMatch(/Freight/)
  })

  it("accepts blank / valid money amounts", () => {
    expect(
      validateTemplatePlannedProductForm({ ...form, unitPrice: "3.50", tax: "2", freight: "" }),
    ).toBe("")
  })
})

describe("computeTemplatePlannedProductLineTotal", () => {
  it("computes qty × unitPrice + tax + freight", () => {
    expect(
      computeTemplatePlannedProductLineTotal({
        quantity: "10",
        unitPrice: "3.50",
        tax: "2.00",
        freight: "5.00",
      }),
    ).toBe("42.00")
  })

  it("coerces blank inputs to zero", () => {
    expect(
      computeTemplatePlannedProductLineTotal({
        quantity: "",
        unitPrice: "3.50",
        tax: "2.00",
        freight: "",
      }),
    ).toBe("2.00")
  })

  it("returns blank when every input is blank", () => {
    expect(
      computeTemplatePlannedProductLineTotal({ quantity: "", unitPrice: "", tax: "", freight: "" }),
    ).toBe("")
  })

  it("rounds the qty × price product half-up to cents", () => {
    // 0.5 × 0.05 = 0.025 → 0.03 half-up (would be 0.02 under floor). Both factors
    // are valid 2-decimal stored values; the sub-cent lands in the product.
    expect(
      computeTemplatePlannedProductLineTotal({
        quantity: "0.5",
        unitPrice: "0.05",
        tax: "",
        freight: "",
      }),
    ).toBe("0.03")
  })
})

describe("computeTemplatePlannedProductLineProfit", () => {
  it("computes qty × (unitPrice − bidCost)", () => {
    // 10 × (3.50 − 2.00) = 15.00. Tax + freight cancel and don't affect profit.
    expect(
      computeTemplatePlannedProductLineProfit({
        quantity: "10",
        unitPrice: "3.50",
        bidCost: "2.00",
        tax: "2.00",
        freight: "5.00",
      }),
    ).toBe("15.00")
  })

  it("returns a signed value when the bid cost exceeds the sell price", () => {
    // 10 × (2.00 − 3.50) = −15.00.
    expect(
      computeTemplatePlannedProductLineProfit({
        quantity: "10",
        unitPrice: "2.00",
        bidCost: "3.50",
        tax: "",
        freight: "",
      }),
    ).toBe("-15.00")
  })

  it("returns blank when qty, unit price, and bid cost are all blank", () => {
    expect(
      computeTemplatePlannedProductLineProfit({
        quantity: "",
        unitPrice: "",
        bidCost: "",
        tax: "2.00",
        freight: "5.00",
      }),
    ).toBe("")
  })

  it("rounds the qty × price / qty × cost products half-up independently", () => {
    // revenue: 0.5 × 0.05 = 0.025 → 0.03; cost: 0.5 × 0.01 = 0.005 → 0.01; 0.02.
    expect(
      computeTemplatePlannedProductLineProfit({
        quantity: "0.5",
        unitPrice: "0.05",
        bidCost: "0.01",
        tax: "",
        freight: "",
      }),
    ).toBe("0.02")
  })
})

describe("computeTemplatePlannedProductLineMargin", () => {
  it("computes profit ÷ line total × 100 to one decimal", () => {
    // profit 40.00 ÷ line total 100.00 × 100 = 40.0%.
    expect(
      computeTemplatePlannedProductLineMargin({
        quantity: "10",
        unitPrice: "10.00",
        bidCost: "6.00",
        tax: "",
        freight: "",
      }),
    ).toBe("40.0")
  })

  it("returns a signed margin when profit is negative", () => {
    // profit −40.00 ÷ line total 60.00 × 100 = −66.7%.
    expect(
      computeTemplatePlannedProductLineMargin({
        quantity: "10",
        unitPrice: "6.00",
        bidCost: "10.00",
        tax: "",
        freight: "",
      }),
    ).toBe("−66.7")
  })

  it("returns blank when the line total is zero (divide-by-zero guard)", () => {
    // qty 0 → line total 0.00 (not blank), so margin guards to "" not a crash.
    expect(
      computeTemplatePlannedProductLineMargin({
        quantity: "0",
        unitPrice: "5.00",
        bidCost: "3.00",
        tax: "",
        freight: "",
      }),
    ).toBe("")
  })

  it("returns blank when every line input is blank", () => {
    expect(
      computeTemplatePlannedProductLineMargin({
        quantity: "",
        unitPrice: "",
        bidCost: "5.00",
        tax: "",
        freight: "",
      }),
    ).toBe("")
  })
})
