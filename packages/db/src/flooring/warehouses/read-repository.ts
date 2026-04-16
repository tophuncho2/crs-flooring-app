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
  slug: string
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
  slug: string
  name: string
  locationsCount: number
  createdAt: string
  updatedAt: string
}

export type LocationRecord = {
  id: string
  warehouseId: string
  sectionId: string
  locationCode: string
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
    slug: row.slug,
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
    slug: row.slug,
    name: row.name,
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
    locationCode: row.locationCode,
    inventoriesCount: row._count.inventories,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function normalizeWarehouseDetail(row: WarehouseDetailPayload): WarehouseDetailRecord {
  return {
    id: row.id,
    slug: row.slug,
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
    orderBy: { name: "asc" },
  })
  return rows.map(normalizeWarehouseRow)
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

export async function warehouseSlugExists(
  slug: string,
  options: { excludeId?: string; client?: WarehousesDbClient } = {},
): Promise<boolean> {
  const client = options.client ?? db
  const existing = await client.flooringWarehouse.findFirst({
    where: {
      slug,
      ...(options.excludeId ? { NOT: { id: options.excludeId } } : {}),
    },
    select: { id: true },
  })
  return Boolean(existing)
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
    orderBy: { name: "asc" },
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

export async function sectionSlugExists(
  warehouseId: string,
  slug: string,
  options: { excludeId?: string; client?: WarehousesDbClient } = {},
): Promise<boolean> {
  const client = options.client ?? db
  const existing = await client.flooringSection.findFirst({
    where: {
      warehouseId,
      slug,
      ...(options.excludeId ? { NOT: { id: options.excludeId } } : {}),
    },
    select: { id: true },
  })
  return Boolean(existing)
}

export async function sectionNameExists(
  warehouseId: string,
  name: string,
  options: { excludeId?: string; client?: WarehousesDbClient } = {},
): Promise<boolean> {
  const client = options.client ?? db
  const existing = await client.flooringSection.findFirst({
    where: {
      warehouseId,
      name: { equals: name, mode: "insensitive" },
      ...(options.excludeId ? { NOT: { id: options.excludeId } } : {}),
    },
    select: { id: true },
  })
  return Boolean(existing)
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
    orderBy: { locationCode: "asc" },
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

export async function locationCodeExists(
  warehouseId: string,
  locationCode: string,
  options: { excludeId?: string; client?: WarehousesDbClient } = {},
): Promise<boolean> {
  const client = options.client ?? db
  const existing = await client.flooringLocation.findFirst({
    where: {
      warehouseId,
      locationCode,
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
