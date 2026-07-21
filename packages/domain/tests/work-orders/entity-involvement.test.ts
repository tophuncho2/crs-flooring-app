import { describe, expect, it } from "vitest"
import { normalizeWorkOrderEntityInvolvement } from "../../src/work-orders/entity-involvement/normalizers.js"
import { validateWorkOrderEntityInvolvementForm } from "../../src/work-orders/entity-involvement/rules.js"

describe("normalizeWorkOrderEntityInvolvement", () => {
  const base = {
    id: "inv-1",
    entityId: "ent-1",
    entity: {
      entity: "Acme Supply",
      entityType: { id: "t1", type: "Vendor", color: "SLATE" as const },
    },
    involvementType: "Sales Rep",
    createdAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    createdBy: "creator@example.com",
    updatedBy: "editor@example.com",
  }

  it("carries the involvement type", () => {
    const row = normalizeWorkOrderEntityInvolvement(base)
    expect(row.involvementType).toBe("Sales Rep")
  })

  it("flattens the linked entity into name + type chips", () => {
    const row = normalizeWorkOrderEntityInvolvement(base)
    expect(row.entityId).toBe("ent-1")
    expect(row.entityName).toBe("Acme Supply")
    expect(row.entityType).toEqual({ id: "t1", type: "Vendor", color: "SLATE" })
  })

  it("coalesces an unlinked entity to null name + type", () => {
    const row = normalizeWorkOrderEntityInvolvement({ ...base, entityId: null, entity: null })
    expect(row.entityId).toBeNull()
    expect(row.entityName).toBeNull()
    expect(row.entityType).toBeNull()
  })

  it("coalesces a missing involvement type + actors to empty/null", () => {
    const row = normalizeWorkOrderEntityInvolvement({
      ...base,
      involvementType: null,
      createdBy: null,
      updatedBy: null,
    })
    expect(row.involvementType).toBe("")
    expect(row.createdBy).toBeNull()
    expect(row.updatedBy).toBeNull()
  })
})

describe("validateWorkOrderEntityInvolvementForm", () => {
  it("accepts any combination (no required fields)", () => {
    expect(validateWorkOrderEntityInvolvementForm({ entityId: null, involvementType: "" })).toBe("")
    expect(
      validateWorkOrderEntityInvolvementForm({ entityId: "ent-1", involvementType: "Installer" }),
    ).toBe("")
    expect(validateWorkOrderEntityInvolvementForm({ entityId: "ent-1", involvementType: "" })).toBe("")
  })
})
