import { describe, expect, it } from "vitest"
import { normalizeTemplateServiceItem } from "../../src/templates/service-items/normalizers.js"
import { validateTemplateServiceItemForm } from "../../src/templates/service-items/rules.js"

describe("normalizeTemplateServiceItem", () => {
  const base = {
    id: "svc-1",
    itemType: "Labor",
    itemName: "Install",
    quantity: { toString: () => "10" } as { toString(): string },
    unitId: "unit-1",
    unit: { name: "Hour", abbreviation: "hr" },
    // MANUAL bid cost (no product join) — the per-unit basis for the line total.
    bidCost: { toString: () => "3.5" } as { toString(): string },
    tax: { toString: () => "2" } as { toString(): string },
    createdAt: "2026-07-08T00:00:00.000Z",
    updatedAt: "2026-07-08T00:00:00.000Z",
    createdBy: "creator@example.com",
    updatedBy: "editor@example.com",
  }

  it("derives the line total off the manual bid cost", () => {
    const row = normalizeTemplateServiceItem(base)
    expect(row.bidCost).toBe("3.50")
    expect(row.tax).toBe("2.00")
    // 10 × 3.50 (bid cost) + 2.00 = 37.00
    expect(row.lineTotal).toBe("37.00")
  })

  it("coalesces missing money/quantity to empty and blanks the line total", () => {
    const row = normalizeTemplateServiceItem({
      ...base,
      quantity: null,
      unitId: null,
      unit: null,
      itemType: null,
      itemName: null,
      bidCost: null,
      tax: null,
      createdBy: null,
      updatedBy: null,
    })
    expect(row.itemType).toBe("")
    expect(row.itemName).toBe("")
    expect(row.quantity).toBe("")
    expect(row.bidCost).toBe("")
    expect(row.tax).toBe("")
    // All inputs blank → blank line total (UI renders "—").
    expect(row.lineTotal).toBe("")
    expect(row.createdBy).toBeNull()
  })
})

describe("validateTemplateServiceItemForm", () => {
  const form = { itemType: "", itemName: "", quantity: "", bidCost: "", tax: "" }

  it("requires nothing — an all-blank row is valid", () => {
    expect(validateTemplateServiceItemForm(form)).toBe("")
  })

  it("rejects an invalid money amount in a job-costing field", () => {
    expect(validateTemplateServiceItemForm({ ...form, bidCost: "abc" })).toMatch(/Bid cost/)
    expect(validateTemplateServiceItemForm({ ...form, tax: "-1" })).toMatch(/Tax/)
  })

  it("rejects a non-positive quantity when provided", () => {
    expect(validateTemplateServiceItemForm({ ...form, quantity: "0" })).toMatch(/greater than zero/)
  })
})
