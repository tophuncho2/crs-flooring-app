import {
  buildAddressLine,
  normalizePhoneNumber,
  type WarehouseDependentCounts,
  type WarehouseListRow,
  type WarehouseStats,
} from "@builders/domain"
import type { Prisma } from "../../generated/prisma/client.js"
import { db } from "../../client.js"
import { numberNeighborQueries } from "../../shared/number-neighbors.js"
import {
  type WarehouseDetailPayload,
  type WarehouseListRowPayload,
  type WarehouseRowPayload,
  type WarehousesDbClient,
  warehouseDetailSelect,
  warehouseListRowSelect,
  warehouseRowSelect,
} from "./shared.js"

// --- Record types ---

export type WarehouseRecord = {
  id: string
  warehouseNumber: string
  name: string
  streetAddress: string
  city: string
  state: string
  postalCode: string
  fullAddress: string
  phone: string | null
  workOrdersCount: number
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

// Adjacent warehouse ids in the global STORE-number order — powers the
// record-view shell stepper. Both null at the sequence edges (or when the row
// carries no generated int yet).
export type WarehouseNeighbors = {
  previousWarehouse: { id: string } | null
  nextWarehouse: { id: string } | null
}

export const NO_WAREHOUSE_NEIGHBORS: WarehouseNeighbors = {
  previousWarehouse: null,
  nextWarehouse: null,
}

export type WarehouseDetailRecord = WarehouseRecord & WarehouseNeighbors

// --- Normalizers ---

export function normalizeWarehouseRow(row: WarehouseRowPayload): WarehouseRecord {
  return {
    id: row.id,
    warehouseNumber: row.warehouseNumber,
    name: row.name,
    streetAddress: row.streetAddress ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    postalCode: row.postalCode ?? "",
    fullAddress: buildAddressLine(row),
    phone: row.phone == null ? null : normalizePhoneNumber(row.phone),
    workOrdersCount: row._count.workOrders,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
  }
}

// --- Read functions: warehouse ---

export type { WarehouseOption } from "@builders/domain"

export async function listWarehouseOptions(
  client: WarehousesDbClient = db,
): Promise<{ id: string; name: string }[]> {
  return client.flooringWarehouse.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  })
}

// --- Picker / options search ---

export type WarehouseOptionsSearchArgs = {
  search?: string
  skip?: number
  take: number
}

export type WarehouseOptionsSearchResult = {
  items: { id: string; name: string }[]
  hasMore: boolean
}

export async function searchWarehouseOptions(
  args: WarehouseOptionsSearchArgs,
  client: WarehousesDbClient = db,
): Promise<WarehouseOptionsSearchResult> {
  const where = args.search
    ? { name: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  // Fetch take+1 (offset by skip) to detect a next page without a count query.
  const skip = Math.max(0, Math.floor(args.skip ?? 0))
  const rows = await client.flooringWarehouse.findMany({
    where,
    orderBy: { name: "asc" },
    skip,
    take: args.take + 1,
    select: { id: true, name: true },
  })

  const hasMore = rows.length > args.take
  return { items: hasMore ? rows.slice(0, args.take) : rows, hasMore }
}

export async function getWarehouseById(
  id: string,
  client: WarehousesDbClient = db,
): Promise<WarehouseRecord | null> {
  const row = await client.flooringWarehouse.findUnique({
    where: { id },
    select: warehouseRowSelect,
  })
  return row ? normalizeWarehouseRow(row) : null
}

export function normalizeWarehouseDetail(
  row: WarehouseDetailPayload,
  neighbors: WarehouseNeighbors = NO_WAREHOUSE_NEIGHBORS,
): WarehouseDetailRecord {
  return {
    ...normalizeWarehouseRow(row),
    previousWarehouse: neighbors.previousWarehouse,
    nextWarehouse: neighbors.nextWarehouse,
  }
}

/**
 * Resolve the warehouse rows immediately before/after the given numeric sort
 * key in the global STORE-number order (`warehouseNumberInt`). Powers the
 * record-view shell stepper — deliberately global (no scoping), two single-row
 * lookups on the `warehouseNumberInt` index. Both null when the key is null
 * (no generated value yet) or the row sits at the sequence edge.
 */
async function getWarehouseNeighbors(
  warehouseNumberInt: number | null,
  client: WarehousesDbClient = db,
): Promise<WarehouseNeighbors> {
  if (warehouseNumberInt === null) return NO_WAREHOUSE_NEIGHBORS

  const { previous: previousQuery, next: nextQuery } = numberNeighborQueries(
    "warehouseNumberInt",
    warehouseNumberInt,
  )
  const [previous, next] = await Promise.all([
    client.flooringWarehouse.findFirst({ ...previousQuery, select: { id: true } }),
    client.flooringWarehouse.findFirst({ ...nextQuery, select: { id: true } }),
  ])

  return {
    previousWarehouse: previous ? { id: previous.id } : null,
    nextWarehouse: next ? { id: next.id } : null,
  }
}

export async function getWarehouseDetailById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: WarehousesDbClient = db,
): Promise<WarehouseDetailRecord | null> {
  const row = await client.flooringWarehouse.findUnique({
    where: { id },
    select: warehouseDetailSelect,
  })
  if (!row) return null
  const neighbors =
    options.withNeighbors === false
      ? NO_WAREHOUSE_NEIGHBORS
      : await getWarehouseNeighbors(row.warehouseNumberInt, client)
  return normalizeWarehouseDetail(row, neighbors)
}

export async function warehouseNameExists(
  name: string,
  options: { excludeId?: string; client?: WarehousesDbClient } = {},
): Promise<boolean> {
  const client = options.client ?? db
  const existing = await client.flooringWarehouse.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(options.excludeId ? { NOT: { id: options.excludeId } } : {}),
    },
    select: { id: true },
  })
  return Boolean(existing)
}

// --- List-view read ---

export type WarehouseListViewOptions = {
  search?: string
  storeNumber?: string
  skip: number
  take: number
}

export type WarehouseListViewResult = {
  rows: WarehouseListRow[]
  total: number
}

function normalizeWarehouseListRow(row: WarehouseListRowPayload): WarehouseListRow {
  return {
    id: row.id,
    warehouseNumber: row.warehouseNumber,
    name: row.name,
    streetAddress: row.streetAddress ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    postalCode: row.postalCode ?? "",
    phone: row.phone == null ? null : normalizePhoneNumber(row.phone),
    workOrdersCount: row._count.workOrders,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy,
    updatedBy: row.updatedBy,
  }
}

export async function listWarehousesForListView(
  options: WarehouseListViewOptions,
  client: WarehousesDbClient = db,
): Promise<WarehouseListViewResult> {
  const clauses: Prisma.FlooringWarehouseWhereInput[] = []
  if (options.search) {
    clauses.push({ name: { contains: options.search, mode: "insensitive" } })
  }
  // Store-number bar: EXACT match on the generated int (btree), mirroring the
  // inventory `# bar`. Strip non-digits so "7" or "STORE-7" both resolve to 7;
  // a non-numeric query hits the -1 sentinel (the sequence is always positive)
  // so it matches nothing.
  const storeNumber = options.storeNumber?.trim()
  if (storeNumber) {
    const digits = storeNumber.replace(/\D/g, "")
    const parsed = digits.length > 0 ? Number.parseInt(digits, 10) : Number.NaN
    clauses.push({ warehouseNumberInt: { equals: Number.isInteger(parsed) ? parsed : -1 } })
  }
  const where = clauses.length > 0 ? { AND: clauses } : undefined

  const [total, rows] = await Promise.all([
    client.flooringWarehouse.count({ where }),
    client.flooringWarehouse.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
      select: warehouseListRowSelect,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeWarehouseListRow),
  }
}

// Read-only totals for the warehouse record-view "Statistics" section. Kept
// separate from `warehouseRowSelect` so the list view doesn't pay for these
// count subqueries per row.
export async function getWarehouseStats(
  id: string,
  client: WarehousesDbClient = db,
): Promise<WarehouseStats | null> {
  const row = await client.flooringWarehouse.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          templates: true,
          workOrders: true,
          imports: true,
        },
      },
    },
  })
  if (!row) return null
  return {
    templatesCount: row._count.templates,
    workOrdersCount: row._count.workOrders,
    importsCount: row._count.imports,
  }
}

export async function getWarehouseDeleteState(
  id: string,
  client: WarehousesDbClient = db,
): Promise<WarehouseDependentCounts | null> {
  const row = await client.flooringWarehouse.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          inventories: true,
          imports: true,
          stagedInventoryRows: true,
          inventoryAdjustments: true,
          workOrders: true,
          templates: true,
        },
      },
    },
  })
  if (!row) return null
  return {
    inventoriesCount: row._count.inventories,
    importsCount: row._count.imports,
    stagedInventoryRowsCount: row._count.stagedInventoryRows,
    inventoryAdjustmentsCount: row._count.inventoryAdjustments,
    workOrdersCount: row._count.workOrders,
    templatesCount: row._count.templates,
  }
}
