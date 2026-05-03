import { db } from "../../client.js"
import {
  type LocationRowPayload,
  type SectionRowPayload,
  type WarehouseDetailPayload,
  type WarehouseRowPayload,
  type WarehousesDbClient,
  locationRowSelect,
  sectionRowSelect,
  warehouseDetailSelect,
  warehouseRowSelect,
} from "./shared.js"

// --- Record types ---

export type WarehouseRecord = {
  id: string
  number: number
  name: string
  address: string | null
  phone: string | null
  sectionsCount: number
  locationsCount: number
  workOrdersCount: number
  createdAt: string
  updatedAt: string
}

export type SectionRecord = {
  id: string
  warehouseId: string
  number: number
  locationsCount: number
  createdAt: string
  updatedAt: string
}

export type LocationRecord = {
  id: string
  warehouseId: string
  sectionId: string
  rafter: number
  level: number
  inventoriesCount: number
  createdAt: string
  updatedAt: string
}

export type WarehouseDetailRecord = WarehouseRecord & {
  sections: SectionRecord[]
  locations: LocationRecord[]
}

// --- Normalizers ---

export function normalizeWarehouseRow(row: WarehouseRowPayload): WarehouseRecord {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    address: row.address,
    phone: row.phone,
    sectionsCount: row._count.sections,
    locationsCount: row._count.locations,
    workOrdersCount: row._count.workOrders,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function normalizeSectionRow(row: SectionRowPayload): SectionRecord {
  return {
    id: row.id,
    warehouseId: row.warehouseId,
    number: row.number,
    locationsCount: row._count.locations,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function normalizeLocationRow(row: LocationRowPayload): LocationRecord {
  return {
    id: row.id,
    warehouseId: row.warehouseId,
    sectionId: row.sectionId,
    rafter: row.rafter,
    level: row.level,
    inventoriesCount: row._count.inventories,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function normalizeWarehouseDetail(row: WarehouseDetailPayload): WarehouseDetailRecord {
  return {
    id: row.id,
    number: row.number,
    name: row.name,
    address: row.address,
    phone: row.phone,
    sectionsCount: row._count.sections,
    locationsCount: row._count.locations,
    workOrdersCount: row._count.workOrders,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    sections: row.sections.map(normalizeSectionRow),
    locations: row.locations.map(normalizeLocationRow),
  }
}

// --- Read functions: warehouse ---

export async function listWarehouses(client: WarehousesDbClient = db): Promise<WarehouseRecord[]> {
  const rows = await client.flooringWarehouse.findMany({
    select: warehouseRowSelect,
    orderBy: { number: "asc" },
  })
  return rows.map(normalizeWarehouseRow)
}

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
  return row ? normalizeWarehouseDetail(row) : null
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

export async function getWarehouseDeleteState(
  id: string,
  client: WarehousesDbClient = db,
): Promise<{ sectionsCount: number; locationsCount: number; workOrdersCount: number } | null> {
  const row = await client.flooringWarehouse.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          sections: true,
          locations: true,
          workOrders: true,
        },
      },
    },
  })
  if (!row) return null
  return {
    sectionsCount: row._count.sections,
    locationsCount: row._count.locations,
    workOrdersCount: row._count.workOrders,
  }
}

// --- Read functions: section ---

export async function listSectionsByWarehouse(
  warehouseId: string,
  client: WarehousesDbClient = db,
): Promise<SectionRecord[]> {
  const rows = await client.flooringSection.findMany({
    where: { warehouseId },
    select: sectionRowSelect,
    orderBy: { number: "asc" },
  })
  return rows.map(normalizeSectionRow)
}

export async function getSectionById(
  id: string,
  client: WarehousesDbClient = db,
): Promise<SectionRecord | null> {
  const row = await client.flooringSection.findUnique({
    where: { id },
    select: sectionRowSelect,
  })
  return row ? normalizeSectionRow(row) : null
}

export async function getExistingSectionNumbers(
  warehouseId: string,
  client: WarehousesDbClient = db,
): Promise<number[]> {
  const rows = await client.flooringSection.findMany({
    where: { warehouseId },
    select: { number: true },
  })
  return rows.map((r) => r.number)
}

export async function getSectionDeleteState(
  id: string,
  client: WarehousesDbClient = db,
): Promise<{ locationsCount: number } | null> {
  const row = await client.flooringSection.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          locations: true,
        },
      },
    },
  })
  if (!row) return null
  return { locationsCount: row._count.locations }
}

// --- Read functions: location ---

export async function listLocationsByWarehouse(
  warehouseId: string,
  client: WarehousesDbClient = db,
): Promise<LocationRecord[]> {
  const rows = await client.flooringLocation.findMany({
    where: { warehouseId },
    select: locationRowSelect,
    orderBy: [{ rafter: "asc" }, { level: "asc" }],
  })
  return rows.map(normalizeLocationRow)
}

export async function getLocationById(
  id: string,
  client: WarehousesDbClient = db,
): Promise<LocationRecord | null> {
  const row = await client.flooringLocation.findUnique({
    where: { id },
    select: locationRowSelect,
  })
  return row ? normalizeLocationRow(row) : null
}

export async function locationCoordExists(
  warehouseId: string,
  rafter: number,
  level: number,
  options: { excludeId?: string; client?: WarehousesDbClient } = {},
): Promise<boolean> {
  const client = options.client ?? db
  const existing = await client.flooringLocation.findFirst({
    where: {
      warehouseId,
      rafter,
      level,
      ...(options.excludeId ? { NOT: { id: options.excludeId } } : {}),
    },
    select: { id: true },
  })
  return Boolean(existing)
}

export async function getLocationDeleteState(
  id: string,
  client: WarehousesDbClient = db,
): Promise<{ inventoriesCount: number } | null> {
  const row = await client.flooringLocation.findUnique({
    where: { id },
    select: {
      _count: {
        select: {
          inventories: true,
        },
      },
    },
  })
  if (!row) return null
  return { inventoriesCount: row._count.inventories }
}
