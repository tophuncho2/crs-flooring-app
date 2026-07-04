import { describe, expect, it } from "vitest"
import {
  normalizeTemplate,
  normalizeTemplateListRow,
} from "../../src/templates/normalizers.js"

describe("normalizeTemplateListRow entity", () => {
  const base = {
    id: "tpl-1",
    templateNumber: "TP-1",
    unitType: "2BR",
    description: null,
    propertyId: "prop-1",
    property: { name: "Maple Court", entity: { id: "entity-1", entity: "Acme" } },
    jobTypeId: null,
    jobType: null,
    warehouseId: null,
    warehouse: null,
    _count: { plannedProducts: 0 },
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
    createdBy: "creator@example.com",
    updatedBy: "editor@example.com",
  }

  it("sources the entity id + name from the linked property", () => {
    const row = normalizeTemplateListRow(base)
    expect(row.entityId).toBe("entity-1")
    expect(row.entityName).toBe("Acme")
  })

  it("yields nulls when the linked property has no entity", () => {
    const row = normalizeTemplateListRow({ ...base, property: { name: "Maple Court", entity: null } })
    expect(row.entityId).toBeNull()
    expect(row.entityName).toBeNull()
  })

  it("passes the actor emails through, coalescing missing ones to null", () => {
    const row = normalizeTemplateListRow(base)
    expect(row.createdBy).toBe("creator@example.com")
    expect(row.updatedBy).toBe("editor@example.com")

    const blank = normalizeTemplateListRow({ ...base, createdBy: null, updatedBy: null })
    expect(blank.createdBy).toBeNull()
    expect(blank.updatedBy).toBeNull()
  })
})

describe("normalizeTemplate neighbors", () => {
  const detailBase = {
    id: "tpl-1",
    templateNumber: "TP-2",
    unitType: "2BR",
    description: null,
    propertyId: "prop-1",
    property: {
      name: "Maple Court",
      entity: { id: "entity-1", entity: "Acme" },
      streetAddress: null,
      city: null,
      state: null,
      postalCode: null,
      instructions: null,
    },
    jobTypeId: null,
    jobType: null,
    warehouseId: null,
    warehouse: null,
    _count: { plannedProducts: 0 },
    internalNotes: null,
    installerInstructions: null,
    plannedProducts: [],
    createdAt: "2026-06-08T00:00:00.000Z",
    updatedAt: "2026-06-08T00:00:00.000Z",
    createdBy: "creator@example.com",
    updatedBy: "editor@example.com",
  }

  it("defaults both neighbors to null when none are supplied", () => {
    const detail = normalizeTemplate(detailBase)
    expect(detail.previousTemplate).toBeNull()
    expect(detail.nextTemplate).toBeNull()
  })

  it("passes through supplied neighbors", () => {
    const detail = normalizeTemplate(detailBase, {
      previousTemplate: { id: "tpl-prev" },
      nextTemplate: { id: "tpl-next" },
    })
    expect(detail.previousTemplate).toEqual({ id: "tpl-prev" })
    expect(detail.nextTemplate).toEqual({ id: "tpl-next" })
  })
})
