import { db } from "../../client.js"
import type { Prisma } from "@prisma/client"
import {
  formatFullLocationCode,
  formatLocationRafterLevel,
  type LocationOption,
  type SectionOption,
} from "@builders/domain"
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

export type SectionOptionsSearchArgs = {
  warehouseId: string
  search?: string
  take: number
}

/**
 * Picker / options search for sections. Numeric search is matched as exact
 * `number` when the query is a clean integer; otherwise no number filter is
 * applied (the picker title is "Section {n}" — no other text columns to ILIKE
 * against). Mirrors the LocationPicker rafter/level parse pattern.
 */
export async function searchSectionOptions(
  args: SectionOptionsSearchArgs,
  client: WarehousesDbClient = db,
): Promise<SectionOption[]> {
  const where: Prisma.FlooringSectionWhereInput = { warehouseId: args.warehouseId }
  const trimmed = args.search?.trim() ?? ""
  const numeric = trimmed.length > 0 && /^\d+$/.test(trimmed) ? Number(trimmed) : null
  if (numeric !== null) where.number = numeric

  const rows = await client.flooringSection.findMany({
    where,
    select: { id: true, warehouseId: true, number: true },
    orderBy: { number: "asc" },
    take: args.take,
  })

  return rows.map((row) => ({
    id: row.id,
    warehouseId: row.warehouseId,
    number: row.number,
    label: `Section ${row.number}`,
  }))
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

// --- Picker / options search ---

/**
 * Parses a "Rx-Lx"-flavored search query into Prisma rafter/level
 * filters. Accepted forms:
 *   "R3-L2" / "3-2" → { rafter: 3, level: 2 }
 *   "R3"            → { rafter: 3 }
 *   "L2"            → { level: 2 }
 *   "3"             → { eitherSide: 3 } (matches rafter OR level)
 *   ""              → {} (no filter)
 */
function parseRafterLevelQuery(query: string): {
  rafter?: number
  level?: number
  eitherSide?: number
} {
  const trimmed = query.trim()
  if (!trimmed) return {}
  const both = trimmed.match(/^R?(\d+)\s*-\s*L?(\d+)$/i)
  if (both) return { rafter: Number(both[1]), level: Number(both[2]) }
  const rafterOnly = trimmed.match(/^R(\d+)$/i)
  if (rafterOnly) return { rafter: Number(rafterOnly[1]) }
  const levelOnly = trimmed.match(/^L(\d+)$/i)
  if (levelOnly) return { level: Number(levelOnly[1]) }
  const single = trimmed.match(/^(\d+)$/)
  if (single) return { eitherSide: Number(single[1]) }
  return {}
}

export type LocationOptionsSearchArgs = {
  warehouseId: string
  /** Optional section narrowing — when set, only locations under that section. */
  sectionId?: string
  search?: string
  take: number
}

export async function searchLocationOptions(
  args: LocationOptionsSearchArgs,
  client: WarehousesDbClient = db,
): Promise<LocationOption[]> {
  const parsed = args.search ? parseRafterLevelQuery(args.search) : {}
  const where: Prisma.FlooringLocationWhereInput = { warehouseId: args.warehouseId }
  if (args.sectionId !== undefined) where.sectionId = args.sectionId
  if (parsed.rafter !== undefined) where.rafter = parsed.rafter
  if (parsed.level !== undefined) where.level = parsed.level
  if (parsed.eitherSide !== undefined) {
    where.OR = [{ rafter: parsed.eitherSide }, { level: parsed.eitherSide }]
  }

  const rows = await client.flooringLocation.findMany({
    where,
    select: {
      id: true,
      warehouseId: true,
      rafter: true,
      level: true,
      section: { select: { number: true } },
      warehouse: { select: { number: true } },
    },
    orderBy: [{ rafter: "asc" }, { level: "asc" }],
    take: args.take,
  })

  return rows.map((row) => ({
    id: row.id,
    warehouseId: row.warehouseId,
    shortCode: formatLocationRafterLevel({ rafter: row.rafter, level: row.level }),
    locationCode: formatFullLocationCode({
      warehouseNumber: row.warehouse.number,
      sectionNumber: row.section.number,
      rafter: row.rafter,
      level: row.level,
    }),
  }))
}
