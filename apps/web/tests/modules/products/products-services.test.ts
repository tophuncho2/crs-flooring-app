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
