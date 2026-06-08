import { describe, expect, it } from "vitest"
import { normalizeWorkOrderListRow } from "../../../src/flooring/work-orders/normalizers.js"

describe("normalizeWorkOrderListRow management company", () => {
  const base = {
    id: "wo-1",
    workOrderNumber: "WO-1",
    propertyId: "prop-1",
    property: { name: "Maple Court", managementCompany: { id: "mc-1", name: "Acme" } },
    jobTypeId: null,
    jobType: null,
    templateId: null,
    warehouseId: null,
    warehouse: null,
    unitNumber: null,
    unitType: null,
    statusId: null,
    status: null,
    vacancy: null,
    timeOfDay: null,
    scheduledFor: null,
    description: null,
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
  }

  it("sources the management company id + name from the linked property", () => {
    const row = normalizeWorkOrderListRow(base)
    expect(row.managementCompanyId).toBe("mc-1")
    expect(row.managementCompanyName).toBe("Acme")
  })

  it("yields nulls when the linked property has no management company", () => {
    const row = normalizeWorkOrderListRow({ ...base, property: { name: "Maple Court", managementCompany: null } })
    expect(row.managementCompanyId).toBeNull()
    expect(row.managementCompanyName).toBeNull()
  })
})
