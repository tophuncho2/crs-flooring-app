import { describe, expect, it } from "vitest"
import { normalizeWorkOrderListRow } from "../../../src/flooring/work-orders/normalizers.js"

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
    description: null,
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
})
