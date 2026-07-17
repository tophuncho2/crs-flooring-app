import { describe, expect, it } from "vitest"
import {
  normalizeWorkOrder,
  normalizeWorkOrderListRow,
} from "../../src/work-orders/normalizers.js"

describe("normalizeWorkOrderListRow entity", () => {
  const base = {
    id: "wo-1",
    workOrderNumber: "WO-1",
    color: "BLUE" as const,
    propertyId: "prop-1",
    property: { name: "Maple Court", entity: { id: "entity-1", entity: "Acme" } },
    jobTypeId: null,
    jobType: null,
    templateId: null,
    warehouseId: null,
    warehouse: null,
    unitNumber: null,
    unitType: null,
    vacancy: null,
    timeOfDay: null,
    scheduledFor: null,
    customerName: null,
    description: null,
    installer: null,
    streetAddress: null,
    city: null,
    state: null,
    postalCode: null,
    purchaseOrderNumber: null,
    return: null,
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
  }

  it("sources the entity id + name from the linked property", () => {
    const row = normalizeWorkOrderListRow(base)
    expect(row.entityId).toBe("entity-1")
    expect(row.entityName).toBe("Acme")
  })

  it("yields nulls when the linked property has no entity", () => {
    const row = normalizeWorkOrderListRow({ ...base, property: { name: "Maple Court", entity: null } })
    expect(row.entityId).toBeNull()
    expect(row.entityName).toBeNull()
  })

  it("passes the palette color through unchanged", () => {
    expect(normalizeWorkOrderListRow(base).color).toBe("BLUE")
  })

  it("passes the purchase order number through, defaulting null to empty string", () => {
    expect(normalizeWorkOrderListRow(base).purchaseOrderNumber).toBe("")
    expect(normalizeWorkOrderListRow({ ...base, purchaseOrderNumber: "PO-4821" }).purchaseOrderNumber).toBe(
      "PO-4821",
    )
  })

  it("passes the return through, defaulting null to empty string", () => {
    expect(normalizeWorkOrderListRow(base).return).toBe("")
    expect(normalizeWorkOrderListRow({ ...base, return: "RET-77" }).return).toBe("RET-77")
  })

  it("passes the customer name through, defaulting null to empty string", () => {
    expect(normalizeWorkOrderListRow(base).customerName).toBe("")
    expect(normalizeWorkOrderListRow({ ...base, customerName: "Jane Doe" }).customerName).toBe("Jane Doe")
  })

  it("passes the installer through, defaulting null to empty string", () => {
    expect(normalizeWorkOrderListRow(base).installer).toBe("")
    expect(normalizeWorkOrderListRow({ ...base, installer: "Crew A" }).installer).toBe("Crew A")
  })
})

describe("normalizeWorkOrder WO-owned address", () => {
  const detailBase = {
    id: "wo-1",
    workOrderNumber: "WO-1",
    color: "BLUE" as const,
    propertyId: "prop-1",
    property: { name: "Maple Court", entity: null, instructions: "Knock twice" },
    jobTypeId: null,
    jobType: null,
    templateId: null,
    warehouseId: null,
    warehouse: null,
    unitNumber: null,
    unitType: null,
    vacancy: null,
    timeOfDay: null,
    scheduledFor: null,
    customerName: null,
    description: null,
    installer: null,
    purchaseOrderNumber: null,
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
    createdBy: null,
    updatedBy: null,
    streetAddress: "12 Oak St",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    internalNotes: null,
    installerInstructions: null,
  }

  it("maps the WO columns to the detail, aliasing postalCode → zip", () => {
    const detail = normalizeWorkOrder(detailBase)
    expect(detail.streetAddress).toBe("12 Oak St")
    expect(detail.city).toBe("Austin")
    expect(detail.state).toBe("TX")
    expect(detail.zip).toBe("78701")
  })

  it("defaults null address columns to empty strings", () => {
    const detail = normalizeWorkOrder({
      ...detailBase,
      streetAddress: null,
      city: null,
      state: null,
      postalCode: null,
    })
    expect(detail.streetAddress).toBe("")
    expect(detail.city).toBe("")
    expect(detail.state).toBe("")
    expect(detail.zip).toBe("")
  })

  it("surfaces the live property instructions for the read-only preview", () => {
    expect(normalizeWorkOrder(detailBase).propertyInstructions).toBe("Knock twice")
  })
})
