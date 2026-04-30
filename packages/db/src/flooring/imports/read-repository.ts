import {
  buildFlooringProductDisplayName,
  formatFullLocationCode,
  formatLocationRafterLevel,
} from "@builders/domain"
import type { ImportDetail, ImportFormOptions, ImportRow } from "@builders/domain"
import type { Prisma } from "@prisma/client"
import { db } from "../../client.js"
import {
  importDetailSelect,
  importRowSelect,
  type ImportDetailPayload,
  type ImportRowPayload,
  type ImportsDbClient,
} from "./shared.js"

export type ImportRecord = ImportRow
export type ImportDetailRecord = ImportDetail

export type ImportsListFilter = {
  searchQuery?: string
  warehouseId?: string
  manufacturerId?: string
}

function toDecimalString(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return ""
  return value.toString()
}

export function normalizeImportRow(row: ImportRowPayload): ImportRecord {
  return {
    id: row.id,
    importNumber: row.importNumber,
    orderNumber: row.orderNumber ?? "",
    tag: row.tag ?? "",
    notes: row.notes ?? "",
    warehouseId: row.warehouseId,
    warehouseName: row.warehouse?.name ?? "",
    manufacturerId: row.manufacturerId ?? "",
    manufacturerName: row.manufacturer?.companyName ?? "",
    stagedInventoryRowsCount: row._count.stagedInventoryRows,
    liveInventoryRowsCount: row._count.inventories,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function normalizeImportDetail(row: ImportDetailPayload): ImportDetailRecord {
  return {
    ...normalizeImportRow(row),
    stagedInventoryRows: row.stagedInventoryRows.map((entry) => ({ id: entry.id })),
    inventories: row.inventories.map((entry) => ({ id: entry.id })),
  }
}

function buildListWhere(filter?: ImportsListFilter) {
  if (!filter) return undefined
  const where: Record<string, unknown> = {}
  if (filter.warehouseId) where.warehouseId = filter.warehouseId
  if (filter.manufacturerId) where.manufacturerId = filter.manufacturerId
  if (filter.searchQuery) {
    const searchQuery = filter.searchQuery
    where.OR = [
      { orderNumber: { contains: searchQuery, mode: "insensitive" } },
      { tag: { contains: searchQuery, mode: "insensitive" } },
      { warehouse: { name: { contains: searchQuery, mode: "insensitive" } } },
      { manufacturer: { companyName: { contains: searchQuery, mode: "insensitive" } } },
    ]
  }
  return where
}

export async function listImports(
  filter?: ImportsListFilter,
  client: ImportsDbClient = db,
): Promise<ImportRecord[]> {
  const rows = await client.flooringImportEntry.findMany({
    where: buildListWhere(filter),
    select: importRowSelect,
    orderBy: [{ createdAt: "desc" }, { importNumber: "desc" }],
  })
  return rows.map(normalizeImportRow)
}

export async function getImportById(
  id: string,
  client: ImportsDbClient = db,
): Promise<ImportRecord | null> {
  const row = await client.flooringImportEntry.findUnique({
    where: { id },
    select: importRowSelect,
  })
  return row ? normalizeImportRow(row) : null
}

export async function getImportDetailById(
  id: string,
  client: ImportsDbClient = db,
): Promise<ImportDetailRecord | null> {
  const row = await client.flooringImportEntry.findUnique({
    where: { id },
    select: importDetailSelect,
  })
  return row ? normalizeImportDetail(row) : null
}

export async function countImports(
  filter?: ImportsListFilter,
  client: ImportsDbClient = db,
): Promise<number> {
  return client.flooringImportEntry.count({ where: buildListWhere(filter) })
}

export type ImportListSortField = "importNumber"
export type ImportListGroupField = "warehouse" | "manufacturer"

export type ImportListViewOptions = {
  search?: string
  sort: { field: ImportListSortField; direction: "asc" | "desc" }
  group: { field: ImportListGroupField } | null
  skip: number
  take: number
}

export type ImportListViewResult = {
  rows: ImportRecord[]
  total: number
}

function buildListViewWhere(search: string | undefined): Prisma.FlooringImportEntryWhereInput | undefined {
  if (!search) return undefined

  const numericImportNumber = Number(search)
  const numericClauses: Prisma.FlooringImportEntryWhereInput[] =
    Number.isFinite(numericImportNumber) && search.trim() !== ""
      ? [{ importNumber: Math.floor(numericImportNumber) }]
      : []

  return {
    OR: [
      ...numericClauses,
      { orderNumber: { contains: search, mode: "insensitive" } },
      { tag: { contains: search, mode: "insensitive" } },
      { notes: { contains: search, mode: "insensitive" } },
      { warehouse: { name: { contains: search, mode: "insensitive" } } },
      { manufacturer: { companyName: { contains: search, mode: "insensitive" } } },
    ],
  }
}

function buildListViewOrderBy(
  sort: ImportListViewOptions["sort"],
  group: ImportListViewOptions["group"],
): Prisma.FlooringImportEntryOrderByWithRelationInput[] {
  const direction: Prisma.SortOrder = sort.direction
  const orderBy: Prisma.FlooringImportEntryOrderByWithRelationInput[] = []

  if (group) {
    if (group.field === "warehouse") {
      orderBy.push({ warehouse: { name: direction } })
    } else if (group.field === "manufacturer") {
      orderBy.push({ manufacturer: { companyName: direction } })
    }
  }

  orderBy.push({ importNumber: direction })
  return orderBy
}

export async function listImportsForListView(
  options: ImportListViewOptions,
  client: ImportsDbClient = db,
): Promise<ImportListViewResult> {
  const where = buildListViewWhere(options.search)
  const orderBy = buildListViewOrderBy(options.sort, options.group)

  const [total, rows] = await Promise.all([
    client.flooringImportEntry.count({ where }),
    client.flooringImportEntry.findMany({
      where,
      orderBy,
      skip: options.skip,
      take: options.take,
      select: importRowSelect,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeImportRow),
  }
}

export async function countStagedInventoryByImportId(
  importEntryId: string,
  client: ImportsDbClient = db,
): Promise<number> {
  return client.flooringImportStagedInventoryRow.count({ where: { importEntryId } })
}

export async function countLiveInventoryByImportId(
  importEntryId: string,
  client: ImportsDbClient = db,
): Promise<number> {
  return client.flooringInventory.count({ where: { importEntryId } })
}

/**
 * Counts of staged + live inventory linked to an import. Field names match the
 * domain `ImportLinkState` shape so the application layer can pass the result
 * directly into `isImportDeleteBlocked` / `isImportWarehouseChangeBlocked`
 * without remapping. Returns null if the import row does not exist (matches
 * the `getInventoryDeleteState` precedent).
 */
export type ImportLinkStateRecord = {
  stagedInventoryRowCount: number
  liveInventoryRowCount: number
}

export async function getImportLinkState(
  id: string,
  client: ImportsDbClient = db,
): Promise<ImportLinkStateRecord | null> {
  const row = await client.flooringImportEntry.findUnique({
    where: { id },
    select: { _count: { select: { stagedInventoryRows: true, inventories: true } } },
  })
  if (!row) return null
  return {
    stagedInventoryRowCount: row._count.stagedInventoryRows,
    liveInventoryRowCount: row._count.inventories,
  }
}

/**
 * Composes the option set the imports record + create views need: products,
 * warehouses, locations, categories, manufacturers. Mirrors
 * `listInventoryOptions` so the modules/data/queries.ts wrapper stays thin.
 *
 * Manufacturers are joined via the import header (one per import). Products,
 * categories, and locations stay flat across the system.
 */
export async function listImportOptions(
  client: ImportsDbClient = db,
): Promise<ImportFormOptions> {
  const [products, warehouses, locations, categories, manufacturers] = await Promise.all([
    client.flooringProduct.findMany({
      select: {
        id: true,
        name: true,
        style: true,
        color: true,
        categoryId: true,
        coveragePerUnit: true,
        category: {
          select: {
            slug: true,
            stockUnit: { select: { name: true } },
            sendUnit: { select: { name: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    client.flooringWarehouse.findMany({
      select: { id: true, name: true, number: true },
      orderBy: { number: "asc" },
    }),
    client.flooringLocation.findMany({
      select: {
        id: true,
        warehouseId: true,
        rafter: true,
        level: true,
        section: { select: { number: true } },
        warehouse: { select: { name: true, number: true } },
      },
      orderBy: [{ warehouse: { name: "asc" } }, { rafter: "asc" }, { level: "asc" }],
    }),
    client.flooringCategory.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    client.flooringManufacturer.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    }),
  ])

  return {
    products: products.map((row) => ({
      id: row.id,
      name: row.name,
      label: buildFlooringProductDisplayName({
        name: row.name,
        style: row.style,
        color: row.color,
      }),
      style: row.style,
      color: row.color,
      categoryId: row.categoryId,
      categorySlug: row.category.slug,
      stockUnit: row.category.stockUnit?.name ?? "",
      sendUnit: row.category.sendUnit?.name ?? "",
      coveragePerUnit: toDecimalString(row.coveragePerUnit),
    })),
    warehouses,
    locations: locations.map((row) => ({
      id: row.id,
      warehouseId: row.warehouseId,
      locationCode: formatFullLocationCode({
        warehouseNumber: row.warehouse.number,
        sectionNumber: row.section.number,
        rafter: row.rafter,
        level: row.level,
      }),
      shortCode: formatLocationRafterLevel({ rafter: row.rafter, level: row.level }),
      sectionNumber: row.section.number,
      warehouseName: row.warehouse.name,
    })),
    categories,
    manufacturers,
  }
}
