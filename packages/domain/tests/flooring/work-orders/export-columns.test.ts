import { describe, expect, it } from "vitest"
import type { WorkOrderListRow } from "../../../src/flooring/work-orders/types.js"
import { WORK_ORDER_EXPORT_COLUMNS } from "../../../src/flooring/work-orders/export-columns.js"

describe("WORK_ORDER_EXPORT_COLUMNS", () => {
  const row: WorkOrderListRow = {
    id: "wo-1",
    workOrderNumber: "WO-1",
    color: "BLUE",
    propertyId: null,
    propertyName: "Maple Court",
    entityId: null,
    entityName: null,
    jobTypeId: null,
    jobTypeName: null,
    templateId: null,
    warehouseId: null,
    warehouseName: "Main",
    unitNumber: "",
    unitType: "",
    vacancy: null,
    timeOfDay: null,
    scheduledFor: "",
    description: "",
    purchaseOrderNumber: "PO-4821",
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
    createdBy: "creator@example.com",
    updatedBy: "editor@example.com",
  }

  it("exports the purchase order number, positioned before Created", () => {
    const column = WORK_ORDER_EXPORT_COLUMNS.find((c) => c.key === "purchaseOrderNumber")
    expect(column).toBeDefined()
    expect(column?.label).toBe("PO #")
    expect(column?.value(row)).toBe("PO-4821")

    const poIndex = WORK_ORDER_EXPORT_COLUMNS.findIndex((c) => c.key === "purchaseOrderNumber")
    const createdIndex = WORK_ORDER_EXPORT_COLUMNS.findIndex((c) => c.key === "createdAt")
    expect(poIndex).toBeGreaterThanOrEqual(0)
    expect(poIndex).toBeLessThan(createdIndex)
  })

  it("includes the actor columns", () => {
    const byKey = (key: string) => WORK_ORDER_EXPORT_COLUMNS.find((c) => c.key === key)
    expect(byKey("createdBy")?.value(row)).toBe("creator@example.com")
    expect(byKey("updatedBy")?.value(row)).toBe("editor@example.com")
  })
})
