import { describe, expect, it, vi } from "vitest"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { resolveProductUnitId, backfillProductUnit } = require(
  "../../scripts/backfill-product-unit.js",
)

const silentLogger = { log: vi.fn(), warn: vi.fn() }

function makePrisma(units: Array<{ id: string; name: string }>, products: unknown[]) {
  const updates: Array<{ where: { id: string }; data: { unitId: string } }> = []
  const tx = {
    flooringUnitOfMeasure: { findMany: vi.fn().mockResolvedValue(units) },
    flooringProduct: {
      findMany: vi.fn().mockResolvedValue(products),
      update: vi.fn().mockImplementation(async (arg: { where: { id: string }; data: { unitId: string } }) => {
        updates.push(arg)
        return {}
      }),
    },
  }
  const prisma = { $transaction: async (fn: (tx: unknown) => unknown) => fn(tx) }
  return { prisma, updates }
}

const unitMap = new Map([["square feet", "u-sf"]])

describe("resolveProductUnitId", () => {
  it("matches stockUnitName to a unit name (case-insensitive)", () => {
    expect(
      resolveProductUnitId({ stockUnitName: "Square Feet", category: null }, unitMap),
    ).toEqual({ unitId: "u-sf", source: "name" })
  })

  it("falls back to the category stock unit id when the name does not match", () => {
    expect(
      resolveProductUnitId({ stockUnitName: null, category: { stockUnitId: "u-cat" } }, unitMap),
    ).toEqual({ unitId: "u-cat", source: "category" })
  })

  it("returns null when neither the name nor the category resolves", () => {
    expect(
      resolveProductUnitId({ stockUnitName: "Unknown", category: { stockUnitId: null } }, unitMap),
    ).toEqual({ unitId: null, source: null })
  })
})

describe("backfillProductUnit", () => {
  const units = [{ id: "u-sf", name: "Square Feet" }]

  it("dry-run tallies name / category / unresolved without writing", async () => {
    const { prisma, updates } = makePrisma(units, [
      { id: "p1", stockUnitName: "Square Feet", category: { stockUnitId: null } },
      { id: "p2", stockUnitName: null, category: { stockUnitId: "u-sf" } },
      { id: "p3", stockUnitName: null, category: { stockUnitId: null } },
    ])

    const report = await backfillProductUnit({ prisma, apply: false, logger: silentLogger })

    expect(report).toMatchObject({ total: 3, byName: 1, byCategory: 1, unresolved: 1, updated: 0 })
    expect(updates).toHaveLength(0)
  })

  it("refuses to apply when any row is unresolved (anomaly-guard)", async () => {
    const { prisma, updates } = makePrisma(units, [
      { id: "p1", stockUnitName: "Square Feet", category: { stockUnitId: null } },
      { id: "p2", stockUnitName: null, category: { stockUnitId: null } },
    ])

    await expect(
      backfillProductUnit({ prisma, apply: true, logger: silentLogger }),
    ).rejects.toThrow(/Refusing to apply/)
    expect(updates).toHaveLength(0)
  })

  it("applies unitId to every resolved row when all resolve", async () => {
    const { prisma, updates } = makePrisma(units, [
      { id: "p1", stockUnitName: "Square Feet", category: { stockUnitId: null } },
      { id: "p2", stockUnitName: null, category: { stockUnitId: "u-sf" } },
    ])

    const report = await backfillProductUnit({ prisma, apply: true, logger: silentLogger })

    expect(report).toMatchObject({ unresolved: 0, updated: 2 })
    expect(updates).toEqual([
      { where: { id: "p1" }, data: { unitId: "u-sf" } },
      { where: { id: "p2" }, data: { unitId: "u-sf" } },
    ])
  })
})
