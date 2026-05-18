import { buildAddressLine, type WarehouseListRow } from "@builders/domain"
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
  take: number
}

export async function searchWarehouseOptions(
  args: WarehouseOptionsSearchArgs,
  client: WarehousesDbClient = db,
): Promise<{ id: string; name: string }[]> {
  const where = args.search
    ? { name: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  return client.flooringWarehouse.findMany({
    where,
    orderBy: { name: "asc" },
    take: args.take,
    select: { id: true, name: true },
  })
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
      orderBy: { name: "asc" },
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

export async function getWarehouseDeleteState(
  id: string,
  client: WarehousesDbClient = db,
): Promise<{ workOrdersCount: number } | null> {
  const row = await client.flooringWarehouse.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          workOrders: true,
        },
      },
    },
  })
  if (!row) return null
  return {
    workOrdersCount: row._count.workOrders,
  }
}
