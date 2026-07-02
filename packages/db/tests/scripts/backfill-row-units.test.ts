import { describe, expect, it, vi } from "vitest"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { resolveRowUnitId, backfillRowUnits, TABLES } = require(
  "../../scripts/backfill-row-units.js",
)

const silentLogger = { log: vi.fn(), warn: vi.fn() }

const unitMap = new Map([["square feet", "u-sf"]])

/**
 * Build a $transaction stub whose four row-model delegates each return the
 * rows from `byTable` and record their updates. `flooringUnitOfMeasure.findMany`
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

describe("resolveRowUnitId", () => {
  it("matches stockUnitName to a unit name (case-insensitive)", () => {
    expect(
      resolveRowUnitId({ stockUnitName: "Square Feet", product: null }, unitMap),
    ).toEqual({ unitId: "u-sf", source: "name" })
  })

  it("falls back to the row's product unitId when the name does not match", () => {
    expect(
      resolveRowUnitId({ stockUnitName: null, product: { unitId: "u-prod" } }, unitMap),
    ).toEqual({ unitId: "u-prod", source: "product" })
  })

  it("returns null when neither the name nor the product resolves", () => {
    expect(
      resolveRowUnitId({ stockUnitName: "Unknown", product: { unitId: null } }, unitMap),
    ).toEqual({ unitId: null, source: null })
  })
})

describe("backfillRowUnits", () => {
  const units = [{ id: "u-sf", name: "Square Feet" }]

  it("only touches rows whose unitId is null (idempotent), tallying per table", async () => {
    const { prisma, updates } = makePrisma(units, {
      flooringInventory: [
        { id: "inv1", unitId: null, stockUnitName: "Square Feet", product: { unitId: "u-prod" } },
        { id: "inv2", unitId: "u-existing", stockUnitName: "Square Feet", product: { unitId: "u-prod" } },
      ],
      flooringInventoryAdjustment: [
        { id: "adj1", unitId: null, stockUnitName: null, product: { unitId: "u-prod" } },
      ],
    })

    const { totals, perTable } = await backfillRowUnits({ prisma, apply: false, logger: silentLogger })

    // inv2 already has a unit → skipped by the JS filter (never a where:unitId:null query).
    expect(perTable.inventory).toMatchObject({ total: 1, byName: 1, unresolved: 0 })
    expect(perTable.adjustment).toMatchObject({ total: 1, byProduct: 1, unresolved: 0 })
    expect(totals).toMatchObject({ total: 2, byName: 1, byProduct: 1, unresolved: 0, updated: 0 })
    expect(updates.flooringInventory).toHaveLength(0)
  })

  it("refuses to apply when any row across the four tables is unresolved (anomaly-guard)", async () => {
    const { prisma, updates } = makePrisma(units, {
      flooringInventory: [
        { id: "inv1", unitId: null, stockUnitName: "Square Feet", product: { unitId: "u-prod" } },
      ],
      flooringImportStagedInventoryRow: [
        { id: "s1", unitId: null, stockUnitName: "Unknown", product: { unitId: null } },
      ],
    })

    await expect(
      backfillRowUnits({ prisma, apply: true, logger: silentLogger }),
    ).rejects.toThrow(/Refusing to apply/)
    expect(updates.flooringInventory).toHaveLength(0)
  })

  it("applies the resolved unitId to every un-backfilled row when all resolve", async () => {
    const { prisma, updates } = makePrisma(units, {
      flooringInventory: [
        { id: "inv1", unitId: null, stockUnitName: "Square Feet", product: { unitId: "u-prod" } },
      ],
      flooringInventoryAdjustment: [
        { id: "adj1", unitId: null, stockUnitName: null, product: { unitId: "u-prod" } },
      ],
    })

    const { totals } = await backfillRowUnits({ prisma, apply: true, logger: silentLogger })

    expect(totals).toMatchObject({ unresolved: 0, updated: 2 })
    expect(updates.flooringInventory).toEqual([{ where: { id: "inv1" }, data: { unitId: "u-sf" } }])
    expect(updates.flooringInventoryAdjustment).toEqual([
      { where: { id: "adj1" }, data: { unitId: "u-prod" } },
    ])
  })
})
