import { describe, expect, it } from "vitest"
import type { EnrichedInventoryAdjustmentRow } from "../../../../src/flooring/inventory/adjustments/types.js"
import { ADJUSTMENTS_EXPORT_COLUMNS } from "../../../../src/flooring/inventory/adjustments/export-columns.js"

describe("ADJUSTMENTS_EXPORT_COLUMNS", () => {
  const row: EnrichedInventoryAdjustmentRow = {
    id: "adj-1",
    adjustmentNumber: "ADJ-1",
    inventoryId: "inv-1",
    inventoryNumber: "INV-9",
    rollPrefix: "R",
    rollNumber: "7",
    dyeLot: "D9",
    inventoryNote: "from import",
    location: "A-12",
    area: "Bay 7",
    categorySlug: "carpet",
    productId: "prod-1",
    productName: "Berber — Oat",
    warehouseId: "wh-1",
    workOrderId: "wo-1",
    before: "100",
    quantity: "25",
    after: "75",
    cost: "12.34",
    freight: "5.00",
    stockUnitName: "Square Feet",
    stockUnitAbbrev: "sq ft",
    adjustmentType: "DEDUCTION",
    isWaste: true,
    internalNotes: "scrap",
    color: "BLUE",
    createdAt: "2026-06-27T12:00:00.000Z",
    updatedAt: "2026-06-27T13:00:00.000Z",
    createdBy: "a@b.com",
    updatedBy: "c@d.com",
    workOrderNumber: "WO-3",
    warehouseName: "Main",
  }

  const byKey = (key: string) => ADJUSTMENTS_EXPORT_COLUMNS.find((c) => c.key === key)

  it("excludes the cost & freight columns (hidden from the UI)", () => {
    expect(byKey("cost")).toBeUndefined()
    expect(byKey("freight")).toBeUndefined()
  })

  it("renders the signed quantity with its unit", () => {
    expect(byKey("quantity")?.value(row)).toBe("−25 sq ft")
  })

  it("renders the before→after transition", () => {
    expect(byKey("adjustment")?.value(row)).toBe("100 sq ft → 75 sq ft")
  })

  it("maps the adjustment type to a friendly label", () => {
    expect(byKey("adjustmentType")?.value(row)).toBe("Deduction")
  })

  it("renders the waste flag as a word, not a boolean", () => {
    expect(byKey("isWaste")?.value(row)).toBe("Waste")
    expect(byKey("isWaste")?.value({ ...row, isWaste: false })).toBe("")
  })

  it("includes the actor columns", () => {
    expect(byKey("createdBy")?.value(row)).toBe("a@b.com")
    expect(byKey("updatedBy")?.value(row)).toBe("c@d.com")
  })

  it("renders the user-owned area free text", () => {
    expect(byKey("area")?.value(row)).toBe("Bay 7")
  })

  it("falls back to empty string for nullable columns (machine-friendly)", () => {
    const blank = { ...row, workOrderNumber: null, dyeLot: null, location: null, area: null }
    expect(byKey("workOrderNumber")?.value(blank)).toBe("")
    expect(byKey("dyeLot")?.value(blank)).toBe("")
    expect(byKey("location")?.value(blank)).toBe("")
    expect(byKey("area")?.value(blank)).toBe("")
  })
})
