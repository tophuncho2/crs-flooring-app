import { describe, expect, it } from "vitest"
import { normalizeTemplateListRow } from "../../../src/management/templates/normalizers.js"

describe("normalizeTemplateListRow management company", () => {
  const base = {
    id: "tpl-1",
    templateNumber: "TP-1",
    unitType: "2BR",
    description: null,
    propertyId: "prop-1",
    property: { name: "Maple Court", managementCompany: { id: "mc-1", name: "Acme" } },
    jobTypeId: null,
    jobType: null,
    warehouseId: null,
    warehouse: null,
    _count: { items: 0 },
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
  }

  it("sources the management company id + name from the linked property", () => {
    const row = normalizeTemplateListRow(base)
    expect(row.managementCompanyId).toBe("mc-1")
    expect(row.managementCompanyName).toBe("Acme")
  })

  it("yields nulls when the linked property has no management company", () => {
    const row = normalizeTemplateListRow({ ...base, property: { name: "Maple Court", managementCompany: null } })
    expect(row.managementCompanyId).toBeNull()
    expect(row.managementCompanyName).toBeNull()
  })
})
