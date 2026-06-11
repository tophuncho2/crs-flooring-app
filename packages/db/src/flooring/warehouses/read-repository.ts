import {
  buildAddressLine,
  type WarehouseDependentCounts,
  type WarehouseListRow,
  type WarehouseStats,
} from "@builders/domain"
import { db } from "../../client.js"
import {
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
  number: number
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
}

export type WarehouseDetailRecord = WarehouseRecord

// --- Normalizers ---

export function normalizeWarehouseRow(row: WarehouseRowPayload): WarehouseRecord {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    streetAddress: row.streetAddress ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    postalCode: row.postalCode ?? "",
    fullAddress: buildAddressLine(row),
    phone: row.phone,
    workOrdersCount: row._count.workOrders,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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

export async function getWarehouseDetailById(
  id: string,
  client: WarehousesDbClient = db,
): Promise<WarehouseDetailRecord | null> {
  const row = await client.flooringWarehouse.findUnique({
    where: { id },
    select: warehouseDetailSelect,
  })
  return row ? normalizeWarehouseRow(row) : null
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

export async function getExistingWarehouseNumbers(
  client: WarehousesDbClient = db,
): Promise<number[]> {
  const rows = await client.flooringWarehouse.findMany({
    select: { number: true },
  })
  return rows.map((r) => r.number)
}

// --- List-view read ---

export type WarehouseListViewOptions = {
  search?: string
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
    number: row.number,
    name: row.name,
    streetAddress: row.streetAddress ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    postalCode: row.postalCode ?? "",
    phone: row.phone,
    workOrdersCount: row._count.workOrders,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listWarehousesForListView(
  options: WarehouseListViewOptions,
  client: WarehousesDbClient = db,
): Promise<WarehouseListViewResult> {
  const where = options.search
    ? { name: { contains: options.search, mode: "insensitive" as const } }
    : undefined

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
