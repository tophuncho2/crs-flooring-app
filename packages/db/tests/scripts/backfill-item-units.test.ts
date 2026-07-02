import { describe, expect, it, vi } from "vitest"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { resolveItemUnitId, backfillItemUnits, TABLES } = require(
  "../../scripts/backfill-item-units.js",
)

const silentLogger = { log: vi.fn(), warn: vi.fn() }

const unitMap = new Map([["square feet", "u-sf"]])

/**
 * Build a $transaction stub whose two item-model delegates each return the
 * items from `byTable` and record their updates. `flooringUnitOfMeasure.findMany`
 * returns the unit list so the resolver has a name→id map.
 */
function makePrisma(
  units: Array<{ id: string; name: string }>,
  byTable: Record<string, unknown[]>,
) {
  const updates: Record<string, Array<{ where: { id: string }; data: { unitId: string } }>> = {}
  const tx: Record<string, unknown> = {
    flooringUnitOfMeasure: { findMany: vi.fn().mockResolvedValue(units) },
  }
  for (const { model } of TABLES) {
    updates[model] = []
    tx[model] = {
      findMany: vi.fn().mockResolvedValue(byTable[model] ?? []),
      update: vi.fn().mockImplementation(async (arg: { where: { id: string }; data: { unitId: string } }) => {
        updates[model].push(arg)
        return {}
      }),
    }
  }
  const prisma = { $transaction: async (fn: (tx: unknown) => unknown) => fn(tx) }
  return { prisma, updates }
}

describe("resolveItemUnitId", () => {
  it("matches sendUnitName to a unit name (case-insensitive)", () => {
    expect(
      resolveItemUnitId({ sendUnitName: "Square Feet", product: null }, unitMap),
    ).toEqual({ unitId: "u-sf", source: "name" })
  })

  it("falls back to the item's product unitId when the name does not match", () => {
    expect(
      resolveItemUnitId({ sendUnitName: null, product: { unitId: "u-prod" } }, unitMap),
    ).toEqual({ unitId: "u-prod", source: "product" })
  })

  it("returns null when neither the name nor the product resolves", () => {
    expect(
      resolveItemUnitId({ sendUnitName: "Unknown", product: { unitId: null } }, unitMap),
    ).toEqual({ unitId: null, source: null })
  })
})

describe("backfillItemUnits", () => {
  const units = [{ id: "u-sf", name: "Square Feet" }]

  it("only touches items whose unitId is null (idempotent), tallying per table", async () => {
    const { prisma, updates } = makePrisma(units, {
      flooringTemplateItem: [
        { id: "t1", unitId: null, sendUnitName: "Square Feet", product: { unitId: "u-prod" } },
        { id: "t2", unitId: "u-existing", sendUnitName: "Square Feet", product: { unitId: "u-prod" } },
      ],
      flooringWorkOrderItem: [
        { id: "w1", unitId: null, sendUnitName: null, product: { unitId: "u-prod" } },
      ],
    })

    const { totals, perTable } = await backfillItemUnits({ prisma, apply: false, logger: silentLogger })

    // t2 already has a unit → skipped by the JS filter (never a where:unitId:null query).
    expect(perTable.templateItem).toMatchObject({ total: 1, byName: 1, unresolved: 0 })
    expect(perTable.workOrderItem).toMatchObject({ total: 1, byProduct: 1, unresolved: 0 })
    expect(totals).toMatchObject({ total: 2, byName: 1, byProduct: 1, unresolved: 0, updated: 0 })
    expect(updates.flooringTemplateItem).toHaveLength(0)
  })

  it("refuses to apply when any item across the two tables is unresolved (anomaly-guard)", async () => {
    const { prisma, updates } = makePrisma(units, {
      flooringTemplateItem: [
        { id: "t1", unitId: null, sendUnitName: "Square Feet", product: { unitId: "u-prod" } },
      ],
      flooringWorkOrderItem: [
        { id: "w1", unitId: null, sendUnitName: "Unknown", product: { unitId: null } },
      ],
    })

    await expect(
      backfillItemUnits({ prisma, apply: true, logger: silentLogger }),
    ).rejects.toThrow(/Refusing to apply/)
    expect(updates.flooringTemplateItem).toHaveLength(0)
  })

  it("applies the resolved unitId to every un-backfilled item when all resolve", async () => {
    const { prisma, updates } = makePrisma(units, {
      flooringTemplateItem: [
        { id: "t1", unitId: null, sendUnitName: "Square Feet", product: { unitId: "u-prod" } },
      ],
      flooringWorkOrderItem: [
        { id: "w1", unitId: null, sendUnitName: null, product: { unitId: "u-prod" } },
      ],
    })

    const { totals } = await backfillItemUnits({ prisma, apply: true, logger: silentLogger })

    expect(totals).toMatchObject({ unresolved: 0, updated: 2 })
    expect(updates.flooringTemplateItem).toEqual([{ where: { id: "t1" }, data: { unitId: "u-sf" } }])
    expect(updates.flooringWorkOrderItem).toEqual([
      { where: { id: "w1" }, data: { unitId: "u-prod" } },
    ])
  })
})
