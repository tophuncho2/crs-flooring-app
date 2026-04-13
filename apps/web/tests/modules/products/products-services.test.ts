import { describe, expect, it } from "vitest"
import { Prisma } from "@builders/db"
import { normalizeCatalogProduct } from "@/modules/products/services"

describe("normalizeCatalogProduct", () => {
  it("products resolve manufacturer display names from company name", () => {
    const normalized = normalizeCatalogProduct({
      id: "prod-1",
      name: "Acme Flooring - Plush - Sand",
      categoryId: "cat-1",
      manufacturerId: "mfg-1",
      manufacturerName: "stale manufacturer name",
      style: "Plush",
      color: "Sand",
      width: null,
      sheetSize: null,
      thickness: null,
      unitWeight: null,
      baseColor: null,
      coveragePerUnit: new Prisma.Decimal("12.5"),
      photoUrls: [],
      notes: null,
      createdAt: new Date("2026-03-18T00:00:00Z"),
      updatedAt: new Date("2026-03-18T00:00:00Z"),
      category: {
        id: "cat-1",
        name: "Carpet",
        sendUnit: { id: "u1", name: "SY" },
        stockUnit: { id: "u2", name: "Roll" },
        coverageAvailableUnit: null,
        itemCoverageUnit: { id: "u3", name: "SF" },
        serviceUnit: null,
      },
      manufacturer: {
        id: "mfg-1",
        companyName: "Acme Flooring",
        agentName: "Jamie Agent",
        website: null,
      },
    })

    expect(normalized.manufacturerName).toBe("Acme Flooring")
  })
})
