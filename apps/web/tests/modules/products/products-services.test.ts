import { describe, expect, it } from "vitest"
import { normalizeProductRow } from "@builders/db"

describe("normalizeProductRow", () => {
  it("products resolve manufacturer display names from the live company name", () => {
    const normalized = normalizeProductRow({
      id: "prod-1",
      name: "Carpet - Plush - Sand",
      categoryId: "cat-1",
      manufacturerId: "mfg-1",
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
      manufacturer: {
        id: "mfg-1",
        companyName: "Acme Flooring",
      },
    })

    expect(normalized.manufacturerName).toBe("Acme Flooring")
    expect(normalized.createdBy).toBe("creator@example.com")
    expect(normalized.updatedBy).toBe("editor@example.com")
  })

  it("surfaces an empty manufacturer name when the manufacturer link is null", () => {
    const normalized = normalizeProductRow({
      id: "prod-2",
      name: "Carpet - Plush - Sand",
      categoryId: "cat-1",
      manufacturerId: null,
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
      manufacturer: null,
    })

    expect(normalized.manufacturerName).toBe("")
    expect(normalized.createdBy).toBeNull()
    expect(normalized.updatedBy).toBeNull()
  })
})
