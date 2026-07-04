import { describe, expect, it } from "vitest"
import type { WorkOrderListRow } from "../../src/work-orders/types.js"
import { WORK_ORDER_EXPORT_COLUMNS } from "../../src/work-orders/export-columns.js"

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
    customerName: "Jane Doe",
    description: "",
    streetAddress: "12 Oak St",
    city: "Austin",
    state: "TX",
    zip: "78701",
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

  it("exports the WO-owned address columns, positioned after Property", () => {
    const byKey = (key: string) => WORK_ORDER_EXPORT_COLUMNS.find((c) => c.key === key)
    expect(byKey("streetAddress")?.label).toBe("Street")
    expect(byKey("streetAddress")?.value(row)).toBe("12 Oak St")
    expect(byKey("city")?.value(row)).toBe("Austin")
    expect(byKey("state")?.value(row)).toBe("TX")
    expect(byKey("zip")?.label).toBe("Zip")
    expect(byKey("zip")?.value(row)).toBe("78701")

    const propertyIndex = WORK_ORDER_EXPORT_COLUMNS.findIndex((c) => c.key === "propertyName")
    const streetIndex = WORK_ORDER_EXPORT_COLUMNS.findIndex((c) => c.key === "streetAddress")
    const jobTypeIndex = WORK_ORDER_EXPORT_COLUMNS.findIndex((c) => c.key === "jobTypeName")
    expect(streetIndex).toBeGreaterThan(propertyIndex)
    expect(streetIndex).toBeLessThan(jobTypeIndex)
  })

  it("exports the customer name, positioned between Property and Street", () => {
    const column = WORK_ORDER_EXPORT_COLUMNS.find((c) => c.key === "customerName")
    expect(column).toBeDefined()
    expect(column?.label).toBe("Customer Name")
    expect(column?.value(row)).toBe("Jane Doe")

    const propertyIndex = WORK_ORDER_EXPORT_COLUMNS.findIndex((c) => c.key === "propertyName")
    const customerIndex = WORK_ORDER_EXPORT_COLUMNS.findIndex((c) => c.key === "customerName")
    const streetIndex = WORK_ORDER_EXPORT_COLUMNS.findIndex((c) => c.key === "streetAddress")
    expect(customerIndex).toBeGreaterThan(propertyIndex)
    expect(customerIndex).toBeLessThan(streetIndex)
  })

  it("includes the actor columns", () => {
    const byKey = (key: string) => WORK_ORDER_EXPORT_COLUMNS.find((c) => c.key === key)
    expect(byKey("createdBy")?.value(row)).toBe("creator@example.com")
    expect(byKey("updatedBy")?.value(row)).toBe("editor@example.com")
  })
})
