import { describe, expect, it } from "vitest"
import { normalizeProductRow } from "@builders/db"

describe("normalizeProductRow", () => {
  it("products resolve entity display names from the live entity name", () => {
    const normalized = normalizeProductRow({
      id: "prod-1",
      name: "Carpet - Plush - Sand",
      categoryId: "cat-1",
      entityId: "ent-1",
      style: "Plush",
      color: "Sand",
      productNamingAddon: null,
      createdAt: new Date("2026-03-18T00:00:00Z"),
      updatedAt: new Date("2026-03-18T00:00:00Z"),
      createdBy: "creator@example.com",
      updatedBy: "editor@example.com",
      category: {
        id: "cat-1",
        slug: "carpet",
        name: "Carpet",
        sendUnit: { id: "u1", name: "SY" },
        stockUnit: { id: "u2", name: "Roll" },
      },
      entity: {
        id: "ent-1",
        entity: "Acme Flooring",
      },
    })

    expect(normalized.entityName).toBe("Acme Flooring")
    expect(normalized.createdBy).toBe("creator@example.com")
    expect(normalized.updatedBy).toBe("editor@example.com")
  })

  it("resolves the unit off the FK, and null unit when unlinked", () => {
    const withUnit = normalizeProductRow({
      id: "prod-3",
      name: "Vinyl - Plank - Ash",
      categoryId: "cat-1",
      unitId: "u-sf",
      unit: { id: "u-sf", name: "Square Feet", abbreviation: "sq ft" },
      entityId: null,
      style: "Plank",
      color: "Ash",
      productNamingAddon: null,
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
      createdBy: null,
      updatedBy: null,
      category: { id: "cat-1", slug: "vinyl", name: "Vinyl", sendUnitId: null, stockUnitId: null },
      entity: null,
    } as never)

    expect(withUnit.unitId).toBe("u-sf")
    expect(withUnit.unit).toEqual({ id: "u-sf", name: "Square Feet", abbreviation: "sq ft" })

    const withoutUnit = normalizeProductRow({
      id: "prod-4",
      name: "Legacy",
      categoryId: "cat-1",
      unitId: null,
      unit: null,
      entityId: null,
      style: null,
      color: null,
      productNamingAddon: null,
      createdAt: new Date("2026-07-01T00:00:00Z"),
      updatedAt: new Date("2026-07-01T00:00:00Z"),
      createdBy: null,
      updatedBy: null,
      category: { id: "cat-1", slug: "vinyl", name: "Vinyl", sendUnitId: null, stockUnitId: null },
      entity: null,
    } as never)

    expect(withoutUnit.unitId).toBe("")
    expect(withoutUnit.unit).toBeNull()
  })

  it("surfaces an empty entity name when the entity link is null", () => {
    const normalized = normalizeProductRow({
      id: "prod-2",
      name: "Carpet - Plush - Sand",
      categoryId: "cat-1",
      entityId: null,
      style: "Plush",
      color: "Sand",
      productNamingAddon: null,
      createdAt: new Date("2026-03-18T00:00:00Z"),
      updatedAt: new Date("2026-03-18T00:00:00Z"),
      createdBy: null,
      updatedBy: null,
      category: {
        id: "cat-1",
        slug: "carpet",
        name: "Carpet",
        sendUnit: null,
        stockUnit: null,
      },
      entity: null,
    })

    expect(normalized.entityName).toBe("")
    expect(normalized.createdBy).toBeNull()
    expect(normalized.updatedBy).toBeNull()
  })
})
