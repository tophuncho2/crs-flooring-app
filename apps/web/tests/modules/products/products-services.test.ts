import { describe, expect, it } from "vitest"
import { Prisma, normalizeProductRow } from "@builders/db"

describe("normalizeProductRow", () => {
  it("products resolve manufacturer display names from the live company name", () => {
    const normalized = normalizeProductRow({
      id: "prod-1",
      name: "Carpet - Plush - Sand",
      categoryId: "cat-1",
      manufacturerId: "mfg-1",
      manufacturerName: "stale manufacturer name",
      style: "Plush",
      color: "Sand",
      width: null,
      sheetSize: null,
      thickness: null,
      unitWeight: null,
      coveragePerUnit: new Prisma.Decimal("12.5"),
      note: null,
      createdAt: new Date("2026-03-18T00:00:00Z"),
      updatedAt: new Date("2026-03-18T00:00:00Z"),
      category: {
        id: "cat-1",
        slug: "carpet",
        name: "Carpet",
        sendUnit: { id: "u1", name: "SY" },
        stockUnit: { id: "u2", name: "Roll" },
        itemCoverageUnit: { id: "u3", name: "SF" },
      },
      manufacturer: {
        id: "mfg-1",
        companyName: "Acme Flooring",
      },
    })

    expect(normalized.manufacturerName).toBe("Acme Flooring")
  })

  it("falls back to stored manufacturerName when companyName is missing (never agentName)", () => {
    const normalized = normalizeProductRow({
      id: "prod-2",
      name: "Carpet - Plush - Sand",
      categoryId: "cat-1",
      manufacturerId: null,
      manufacturerName: "Legacy Co",
      style: "Plush",
      color: "Sand",
      width: null,
      sheetSize: null,
      thickness: null,
      unitWeight: null,
      coveragePerUnit: null,
      note: null,
      createdAt: new Date("2026-03-18T00:00:00Z"),
      updatedAt: new Date("2026-03-18T00:00:00Z"),
      category: {
        id: "cat-1",
        slug: "carpet",
        name: "Carpet",
        sendUnit: null,
        stockUnit: null,
        itemCoverageUnit: null,
      },
      manufacturer: null,
    })

    expect(normalized.manufacturerName).toBe("Legacy Co")
  })
})
