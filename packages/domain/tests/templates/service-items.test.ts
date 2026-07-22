import { describe, expect, it } from "vitest"
import { normalizeTemplateServiceItem } from "../../src/templates/service-items/normalizers.js"
import { validateTemplateServiceItemForm } from "../../src/templates/service-items/rules.js"
import { sumTemplateServiceItemLineTotalsByType } from "../../src/templates/service-items/rollup.js"

describe("normalizeTemplateServiceItem", () => {
  const base = {
    id: "svc-1",
    itemType: "LABOR",
    itemName: "Install",
    quantity: { toString: () => "10" } as { toString(): string },
    unitId: "unit-1",
    unit: { name: "Hour", abbreviation: "hr" },
    // MANUAL bid cost (no product join) — the per-unit basis for the line total.
    bidCost: { toString: () => "3.5" } as { toString(): string },
    taxed: false,
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-08T00:00:00.000Z",
    createdBy: "creator@example.com",
    updatedBy: "editor@example.com",
  }

  it("derives the line total off the manual bid cost", () => {
    const row = normalizeTemplateServiceItem(base)
    expect(row.bidCost).toBe("3.50")
    // 10 × 3.50 (bid cost) = 35.00
    expect(row.lineTotal).toBe("35.00")
    // Taxed flag passes straight through.
    expect(row.taxed).toBe(false)
  })

  it("passes the required itemType through and coalesces missing money/quantity", () => {
    const row = normalizeTemplateServiceItem({
      ...base,
      itemType: "MISCELLANEOUS",
      quantity: null,
      unitId: null,
      unit: null,
      itemName: null,
      bidCost: null,
      createdBy: null,
      updatedBy: null,
    })
    expect(row.itemType).toBe("MISCELLANEOUS")
    expect(row.itemName).toBe("")
    expect(row.quantity).toBe("")
    expect(row.bidCost).toBe("")
    // All inputs blank → blank line total (UI renders "—").
    expect(row.lineTotal).toBe("")
    expect(row.createdBy).toBeNull()
  })
})

describe("validateTemplateServiceItemForm", () => {
  const form = { itemType: "LABOR", itemName: "", quantity: "", bidCost: "" }

  it("accepts a row with a valid itemType and nothing else", () => {
    expect(validateTemplateServiceItemForm(form)).toBe("")
  })

  it("rejects a blank itemType (required)", () => {
    expect(validateTemplateServiceItemForm({ ...form, itemType: "" })).toMatch(/Item type/)
  })

  it("rejects an unknown itemType", () => {
    expect(validateTemplateServiceItemForm({ ...form, itemType: "Plumbing" })).toMatch(/Item type/)
  })

  it("validates itemType even when quantity is blank (the early-return path)", () => {
    // Guards the ordering fix: a blank quantity must not let an invalid type slip by.
    expect(validateTemplateServiceItemForm({ ...form, itemType: "nope", quantity: "" })).toMatch(/Item type/)
  })

  it("rejects an invalid money amount in the bid-cost field", () => {
    expect(validateTemplateServiceItemForm({ ...form, bidCost: "abc" })).toMatch(/Bid cost/)
  })

  it("rejects a non-positive quantity when provided", () => {
    expect(validateTemplateServiceItemForm({ ...form, quantity: "0" })).toMatch(/greater than zero/)
  })
})

describe("sumTemplateServiceItemLineTotalsByType", () => {
  it("sums line totals grouped by item type", () => {
    const result = sumTemplateServiceItemLineTotalsByType([
      { itemType: "LABOR", quantity: "10", bidCost: "3.50" }, // 35.00
      { itemType: "LABOR", quantity: "2", bidCost: "5.00" }, // 10.00
      { itemType: "MISCELLANEOUS", quantity: "4", bidCost: "1.25" }, // 5.00
    ])
    expect(result.LABOR).toBe("45.00")
    expect(result.MISCELLANEOUS).toBe("5.00")
  })

  it("returns 0.00 for a type with no items", () => {
    const result = sumTemplateServiceItemLineTotalsByType([
      { itemType: "LABOR", quantity: "1", bidCost: "9.99" },
    ])
    expect(result.LABOR).toBe("9.99")
    expect(result.MISCELLANEOUS).toBe("0.00")
  })

  it("totals to 0.00 for every type on an empty list", () => {
    const result = sumTemplateServiceItemLineTotalsByType([])
    expect(result.LABOR).toBe("0.00")
    expect(result.MISCELLANEOUS).toBe("0.00")
  })
})
