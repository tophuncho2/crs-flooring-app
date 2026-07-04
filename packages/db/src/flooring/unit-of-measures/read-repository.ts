import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeUnitOfMeasureDetail,
  normalizeUnitOfMeasureListRow,
  type UnitOfMeasure,
  type UnitOfMeasureListRow,
  type UnitOfMeasureOption,
  type UnitOfMeasureStats,
} from "@builders/domain"

type UnitOfMeasureDbClient = PrismaClient | Prisma.TransactionClient

// --- List view (counted pagination) ---

export type UnitOfMeasureListViewOptions = {
  skip: number
  take: number
}

export type UnitOfMeasureListViewResult = {
  rows: UnitOfMeasureListRow[]
  total: number
}

// Read-only units list — no search/filter (the surface is a bare data table).
// Counted pagination: count + page fetch in parallel, mirroring the users read.
export async function listUnitOfMeasuresForListView(
  options: UnitOfMeasureListViewOptions,
  client: UnitOfMeasureDbClient = db,
): Promise<UnitOfMeasureListViewResult> {
  const [total, rows] = await Promise.all([
    client.flooringUnitOfMeasure.count(),
    client.flooringUnitOfMeasure.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
      select: {
        id: true,
        name: true,
        abbreviation: true,
        createdAt: true,
      },
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeUnitOfMeasureListRow),
  }
}

// --- Single fetch (existence guard) ---

// Point read by id — powers the application-layer existence guard on the unit FK
// (mirrors getProductById / getWarehouseById). Returns the option shape or null.
export async function getUnitOfMeasureById(
  id: string,
  client: UnitOfMeasureDbClient = db,
): Promise<UnitOfMeasureOption | null> {
  const row = await client.flooringUnitOfMeasure.findUnique({
    where: { id },
    select: { id: true, name: true, abbreviation: true },
  })
  return row ? { id: row.id, name: row.name, abbreviation: row.abbreviation } : null
}

// --- Record-view detail + stats (read-only) ---

// Point read for the read-only unit-of-measure detail page. Selects name +
// abbreviation + timestamps (no actor columns on this seed table). `null` when
// missing.
export async function getUnitOfMeasureDetailById(
  id: string,
  client: UnitOfMeasureDbClient = db,
): Promise<UnitOfMeasure | null> {
  const unit = await client.flooringUnitOfMeasure.findUnique({
    where: { id },
    select: { id: true, name: true, abbreviation: true, createdAt: true, updatedAt: true },
  })
  return unit ? normalizeUnitOfMeasureDetail(unit) : null
}

// Usage counts for the detail view. The unit has eight FK referrers; surface the
// two most meaningful plus a total across all of them (a read-only preview of
// what the future delete-guard will enforce).
export async function getUnitOfMeasureStats(
  id: string,
  client: UnitOfMeasureDbClient = db,
): Promise<UnitOfMeasureStats | null> {
  const row = await client.flooringUnitOfMeasure.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          products: true,
          coverageProducts: true,
          inventories: true,
          adjustments: true,
          stagedRows: true,
          stagedFilterRows: true,
          plannedProducts: true,
          workOrderItems: true,
        },
      },
    },
  })
  if (!row) return null
  const c = row._count
  return {
    productsCount: c.products,
    inventoriesCount: c.inventories,
    totalUsage:
      c.products +
      c.coverageProducts +
      c.inventories +
      c.adjustments +
      c.stagedRows +
      c.stagedFilterRows +
      c.plannedProducts +
      c.workOrderItems,
  }
}

// --- Picker options (infinite-scroll search) ---

export type UnitOfMeasureOptionsSearchArgs = {
  search?: string
  skip?: number
  take: number
}

export type UnitOfMeasureOptionsSearchResult = {
  items: UnitOfMeasureOption[]
  hasMore: boolean
}

export async function searchUnitOfMeasureOptions(
  args: UnitOfMeasureOptionsSearchArgs,
  client: UnitOfMeasureDbClient = db,
): Promise<UnitOfMeasureOptionsSearchResult> {
  const where = args.search
    ? { name: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  // Fetch take+1 (offset by skip) to detect a next page without a count query.
  const skip = Math.max(0, Math.floor(args.skip ?? 0))
  const rows = await client.flooringUnitOfMeasure.findMany({
    where,
    orderBy: { name: "asc" },
    skip,
    take: args.take + 1,
    select: { id: true, name: true, abbreviation: true },
  })

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return {
    items: page.map((row) => ({ id: row.id, name: row.name, abbreviation: row.abbreviation })),
    hasMore,
  }
}
