import { describe, expect, it, vi } from "vitest"
import {
  backfillProductNames,
  buildCanonicalProductName,
  resolveBackfillOptions,
} from "../../packages/db/scripts/backfill-product-names.js"

describe("buildCanonicalProductName", () => {
  it("uses category, style, and color to build the canonical product name", () => {
    expect(
      buildCanonicalProductName({
        categoryName: "Plank",
        style: "Modern Oak",
        color: "Driftwood",
      }),
    ).toBe("Plank - Modern Oak - Driftwood")
  })
})

describe("resolveBackfillOptions", () => {
  it("supports dry-run mode", () => {
    expect(resolveBackfillOptions(["--dry-run"])).toEqual({ dryRun: true })
  })

  it("rejects unsupported arguments", () => {
    expect(() => resolveBackfillOptions(["--bad-flag"])).toThrow(
      "Usage: node scripts/backfill-product-names.js [--dry-run]",
    )
  })
})

describe("backfillProductNames", () => {
  it("updates only products whose canonical name has changed", async () => {
    const update = vi.fn(async ({ where, data }) => ({
      id: where.id,
      name: data.name,
    }))

    const summary = await backfillProductNames({
      prisma: {
        flooringProduct: {
          findMany: vi.fn(async () => [
            {
              id: "prod-1",
              name: "Acme Flooring - Plush - Sand",
              style: "Plush",
              color: "Sand",
              category: { name: "Carpet" },
            },
            {
              id: "prod-2",
              name: "Vinyl - Tile - Ash",
              style: "Tile",
              color: "Ash",
              category: { name: "Vinyl" },
            },
          ]),
          update,
        },
      },
      logger: { log: vi.fn() },
    })

    expect(summary).toEqual({
      checked: 2,
      changed: 1,
      dryRun: false,
    })
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { name: "Carpet - Plush - Sand" },
    })
  })

  it("supports dry-run mode without writing updates", async () => {
    const update = vi.fn()

    const summary = await backfillProductNames({
      prisma: {
        flooringProduct: {
          findMany: vi.fn(async () => [
            {
              id: "prod-1",
              name: "Old Name",
              style: "Plush",
              color: "Sand",
              category: { name: "Carpet" },
            },
          ]),
          update,
        },
      },
      dryRun: true,
      logger: { log: vi.fn() },
    })

    expect(summary).toEqual({
      checked: 1,
      changed: 1,
      dryRun: true,
    })
    expect(update).not.toHaveBeenCalled()
  })
})
