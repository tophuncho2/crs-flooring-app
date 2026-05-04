import {
  buildFlooringProductDisplayName,
  computeInventoryBalance,
  computeInventoryCoverage,
  formatFullLocationCode,
  formatLocationRafterLevel,
  toInventoryFixedString,
} from "@builders/domain"
import type {
  InventoryDetail,
  InventoryFormOptions,
  InventoryOption,
  InventoryRow,
} from "@builders/domain"
import type { Prisma } from "@prisma/client"
import { db } from "../../client.js"
import { normalizeInventoryCutLogRow } from "./cut-logs/read-repository.js"
import {
  inventoryDetailSelect,
  inventoryRowSelect,
  type InventoryDbClient,
  type InventoryDetailPayload,
  type InventoryRowPayload,
} from "./shared.js"

export type InventoryRecord = InventoryRow
export type InventoryDetailRecord = InventoryDetail

export type InventoryListFilter = {
  importEntryId?: string
  warehouseId?: string
  productId?: string
  categoryId?: string
  isArchived?: boolean
}

function toDecimalString(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return ""
  return value.toString()
}

function toNumber(value: { toString(): string } | number | null | undefined): number {
  if (value === null || value === undefined) return 0
  const parsed = typeof value === "number" ? value : Number(value.toString())
  return Number.isFinite(parsed) ? parsed : 0
}

function buildLocationCode(location: InventoryRowPayload["location"]): string {
  if (!location) return ""
  return formatFullLocationCode({
    warehouseNumber: location.warehouse.number,
    sectionNumber: location.section.number,
    rafter: location.rafter,
    level: location.level,
  })
}

function buildLocationShortCode(location: InventoryRowPayload["location"]): string {
  if (!location) return ""
  return formatLocationRafterLevel({ rafter: location.rafter, level: location.level })
}

/**
 * Normalize an inventory row into the domain read shape. Stamps the two
 * computed fields (`stockBalance`, `coverageBalance`) by calling the pure
 * domain helpers — single source of truth for the math. Per the data-package
 * carve-out, this is a data-layer normalizer reusing pure domain
 * formatters/computations; it MUST NOT call domain rules that throw.
 */
export function normalizeInventoryRow(payload: InventoryRowPayload): InventoryRecord {
  // Read the snapshot column, not the joined product.category.slug. The
  // snapshot is stamped at worker-create time and is immutable thereafter;
  // the product's category can no longer change while inventory exists (see
  // isProductCategoryChangeBlocked), so the joined display fields
  // categoryId/categoryName on product.category stay consistent with this
  // slug by construction.
  const categorySlug = payload.categorySlug
  const balanceNum = computeInventoryBalance({
    startingStock: payload.startingStock.toString(),
    totalCutSum: payload.totalCutSum.toString(),
  })
  const coverageNum = computeInventoryCoverage({
    balance: balanceNum,
    coveragePerUnit:
      payload.coveragePerUnit === null ? null : payload.coveragePerUnit.toString(),
    categorySlug,
  })

  const location = payload.location
  const importEntry = payload.importEntry

  return {
    id: payload.id,
    inventoryNumber: payload.inventoryNumber,
    importEntryId: payload.importEntryId ?? "",
    importNumber: importEntry ? String(importEntry.importNumber) : "",
    importWarehouseId: importEntry?.warehouseId ?? "",
    importWarehouseName: importEntry?.warehouse?.name ?? "",
    productId: payload.productId,
    productName: buildFlooringProductDisplayName({
      name: payload.product.name,
      style: payload.product.style,
      color: payload.product.color,
    }),
    categoryId: payload.product.category.id,
    categoryName: payload.product.category.name,
    categorySlug,
    stockUnitName: payload.stockUnitName ?? "",
    stockUnitAbbrev: payload.stockUnitAbbrev ?? "",
    itemCoverageUnitName: payload.itemCoverageUnitName ?? "",
    itemCoverageUnitAbbrev: payload.itemCoverageUnitAbbrev ?? "",
    sendUnitName: payload.sendUnitName ?? "",
    sendUnitAbbrev: payload.sendUnitAbbrev ?? "",
    itemNumber: payload.itemNumber ?? "",
    dyeLot: payload.dyeLot ?? "",
    warehouseId: payload.warehouseId,
    warehouseName: payload.warehouse.name,
    warehouseNumber: String(payload.warehouse.number),
    locationId: payload.locationId ?? "",
    locationCode: buildLocationCode(location),
    locationShortCode: buildLocationShortCode(location),
    sectionNumber: location?.section ? String(location.section.number) : "",
    rafter: location ? String(location.rafter) : "",
    level: location ? String(location.level) : "",
    startingStock: toDecimalString(payload.startingStock),
    totalCutSum: toDecimalString(payload.totalCutSum),
    coveragePerUnit: toDecimalString(payload.coveragePerUnit),
    stockBalance: toInventoryFixedString(balanceNum),
    coverageBalance: coverageNum === null ? "" : toInventoryFixedString(coverageNum),
    isArchived: payload.isArchived,
    notes: payload.notes ?? "",
    fifoReceivedAt: payload.fifoReceivedAt.toISOString(),
    createdAt: payload.createdAt.toISOString(),
    updatedAt: payload.updatedAt.toISOString(),
  }
}

export function normalizeInventoryDetail(
  payload: InventoryDetailPayload,
): InventoryDetailRecord {
  return {
    ...normalizeInventoryRow(payload),
    cutLogs: payload.cutLogs.map(normalizeInventoryCutLogRow),
  }
}

function buildListWhere(filter?: InventoryListFilter) {
  if (!filter) return undefined
  const where: Record<string, unknown> = {}
  if (filter.importEntryId) where.importEntryId = filter.importEntryId
  if (filter.warehouseId) where.warehouseId = filter.warehouseId
  if (filter.productId) where.productId = filter.productId
  if (filter.categoryId) where.product = { categoryId: filter.categoryId }
  if (filter.isArchived !== undefined) where.isArchived = filter.isArchived
  return where
}

export async function listInventory(
  filter?: InventoryListFilter,
  client: InventoryDbClient = db,
): Promise<InventoryRecord[]> {
  const rows = await client.flooringInventory.findMany({
    where: buildListWhere(filter),
    select: inventoryRowSelect,
    orderBy: [{ fifoReceivedAt: "asc" }, { itemNumber: "asc" }, { id: "asc" }],
  })
  return rows.map(normalizeInventoryRow)
}

export async function getInventoryById(
  id: string,
  client: InventoryDbClient = db,
): Promise<InventoryRecord | null> {
  const row = await client.flooringInventory.findUnique({
    where: { id },
    select: inventoryRowSelect,
  })
  return row ? normalizeInventoryRow(row) : null
}

export async function getInventoryDetailById(
  id: string,
  client: InventoryDbClient = db,
): Promise<InventoryDetailRecord | null> {
  const row = await client.flooringInventory.findUnique({
    where: { id },
    select: inventoryDetailSelect,
  })
  return row ? normalizeInventoryDetail(row) : null
}

export async function countInventory(
  filter?: InventoryListFilter,
  client: InventoryDbClient = db,
): Promise<number> {
  return client.flooringInventory.count({ where: buildListWhere(filter) })
}

export async function getInventoryDeleteState(
  id: string,
  client: InventoryDbClient = db,
): Promise<{ hasCutLogs: boolean; cutLogsCount: number } | null> {
  const row = await client.flooringInventory.findUnique({
    where: { id },
    select: { _count: { select: { cutLogs: true } } },
  })
  if (!row) return null
  const cutLogsCount = row._count.cutLogs
  return { hasCutLogs: cutLogsCount > 0, cutLogsCount }
}

export async function countInventoriesByProductId(
  productId: string,
  client: InventoryDbClient = db,
): Promise<number> {
  return client.flooringInventory.count({ where: { productId } })
}

// --- List view read (paginated, server-side filtered) ---

export type InventoryListViewOptions = {
  search?: string
  filters?: {
    warehouseId?: ReadonlyArray<string>
    sectionId?: ReadonlyArray<string>
    locationId?: ReadonlyArray<string>
    categoryId?: ReadonlyArray<string>
    productId?: ReadonlyArray<string>
  }
  skip: number
  take: number
}

export type InventoryListViewResult = {
  rows: InventoryRecord[]
  total: number
}

function buildListViewWhere(
  options: Pick<InventoryListViewOptions, "search" | "filters">,
): Prisma.FlooringInventoryWhereInput | undefined {
  const clauses: Prisma.FlooringInventoryWhereInput[] = [{ isArchived: false }]

  // Search semantics mirror searchInventoryOptions: OR-ILIKE across the three
  // human-meaningful identifier columns (inventoryNumber, itemNumber, dyeLot).
  const trimmed = options.search?.trim() ?? ""
  if (trimmed.length > 0) {
    clauses.push({
      OR: [
        { inventoryNumber: { contains: trimmed, mode: "insensitive" } },
        { itemNumber: { contains: trimmed, mode: "insensitive" } },
        { dyeLot: { contains: trimmed, mode: "insensitive" } },
      ],
    })
  }

  const warehouseIds = options.filters?.warehouseId
  if (warehouseIds && warehouseIds.length > 0) {
    clauses.push({ warehouseId: { in: [...warehouseIds] } })
  }

  // sectionId narrows via the joined location row — inventory has no direct
  // sectionId FK; the section is reachable via location.sectionId.
  const sectionIds = options.filters?.sectionId
  if (sectionIds && sectionIds.length > 0) {
    clauses.push({ location: { is: { sectionId: { in: [...sectionIds] } } } })
  }

  const locationIds = options.filters?.locationId
  if (locationIds && locationIds.length > 0) {
    clauses.push({ locationId: { in: [...locationIds] } })
  }

  // categoryId narrows via product.categoryId — same path as the existing
  // single-value category filter on `listInventory`.
  const categoryIds = options.filters?.categoryId
  if (categoryIds && categoryIds.length > 0) {
    clauses.push({ product: { is: { categoryId: { in: [...categoryIds] } } } })
  }

  const productIds = options.filters?.productId
  if (productIds && productIds.length > 0) {
    clauses.push({ productId: { in: [...productIds] } })
  }

  if (clauses.length === 0) return undefined
  if (clauses.length === 1) return clauses[0]
  return { AND: clauses }
}

/**
 * Server-side paginated read for the inventory list view. Default sort is
 * `inventoryNumber DESC` (newest INV-NNNNN first), with `id DESC` as a stable
 * tiebreak. Filters AND together; search OR-ILIKEs across inventoryNumber,
 * itemNumber, and dyeLot. Archived rows excluded.
 *
 * Lives alongside `listInventory(filter?)` which is still used by the imports
 * record view's "live rows" section to fetch all rows for a given import.
 */
export async function listInventoryForListView(
  options: InventoryListViewOptions,
  client: InventoryDbClient = db,
): Promise<InventoryListViewResult> {
  const where = buildListViewWhere(options)
  const orderBy: Prisma.FlooringInventoryOrderByWithRelationInput[] = [
    { inventoryNumber: "desc" },
    { id: "desc" },
  ]

  const [total, rows] = await Promise.all([
    client.flooringInventory.count({ where }),
    client.flooringInventory.findMany({
      where,
      orderBy,
      skip: options.skip,
      take: options.take,
      select: inventoryRowSelect,
    }),
  ])

  return { total, rows: rows.map(normalizeInventoryRow) }
}

export type InventoryOptionsSearchArgs = {
  warehouseId: string
  /**
   * Optional product narrowing — when set, only inventory rows whose product
   * matches. Cut-log pickers always pass this so users can't reference an
   * inventory row of a different product than the material item's.
   */
  productId?: string
  /** Optional section narrowing — joined via `location.sectionId`. */
  sectionId?: string
  /** Optional location narrowing — exact match on the inventory row. */
  locationId?: string
  /** OR-ILIKE across `inventoryNumber`, `itemNumber`, `dyeLot`. */
  search?: string
  take: number
}

/**
 * Picker / options search for inventory rows. Filters are AND'd: warehouse +
 * (optional) section + (optional) location, then OR'd ILIKE across the three
 * search columns. Archived rows excluded. Balance + coverage are stamped via
 * the same pure helpers used by the row normalizer (single source of truth
 * for the math) — coverage is null for non-coverage categories.
 */
export async function searchInventoryOptions(
  args: InventoryOptionsSearchArgs,
  client: InventoryDbClient = db,
): Promise<InventoryOption[]> {
  const where: Prisma.FlooringInventoryWhereInput = {
    warehouseId: args.warehouseId,
    isArchived: false,
  }
  if (args.productId !== undefined) where.productId = args.productId
  if (args.locationId !== undefined) where.locationId = args.locationId
  if (args.sectionId !== undefined) {
    where.location = { is: { sectionId: args.sectionId } }
  }

  const trimmed = args.search?.trim() ?? ""
  if (trimmed.length > 0) {
    where.OR = [
      { inventoryNumber: { contains: trimmed, mode: "insensitive" } },
      { itemNumber: { contains: trimmed, mode: "insensitive" } },
      { dyeLot: { contains: trimmed, mode: "insensitive" } },
    ]
  }

  const rows = await client.flooringInventory.findMany({
    where,
    select: {
      id: true,
      inventoryNumber: true,
      itemNumber: true,
      dyeLot: true,
      warehouseId: true,
      locationId: true,
      categorySlug: true,
      stockUnitAbbrev: true,
      itemCoverageUnitAbbrev: true,
      startingStock: true,
      totalCutSum: true,
      coveragePerUnit: true,
      location: { select: { sectionId: true } },
    },
    orderBy: [{ inventoryNumber: "asc" }],
    take: args.take,
  })

  return rows.map((row) => {
    const balanceNum = computeInventoryBalance({
      startingStock: row.startingStock.toString(),
      totalCutSum: row.totalCutSum.toString(),
    })
    const coverageNum = computeInventoryCoverage({
      balance: balanceNum,
      coveragePerUnit: row.coveragePerUnit === null ? null : row.coveragePerUnit.toString(),
      categorySlug: row.categorySlug,
    })
    return {
      id: row.id,
      inventoryNumber: row.inventoryNumber,
      itemNumber: row.itemNumber ?? "",
      dyeLot: row.dyeLot ?? "",
      warehouseId: row.warehouseId,
      locationId: row.locationId ?? "",
      sectionId: row.location?.sectionId ?? "",
      stockBalance: toInventoryFixedString(balanceNum),
      stockUnitAbbrev: row.stockUnitAbbrev ?? "",
      coverageBalance: coverageNum === null ? null : toInventoryFixedString(coverageNum),
      itemCoverageUnitAbbrev: row.itemCoverageUnitAbbrev ?? "",
    }
  })
}

export async function listInventoryOptions(
  client: InventoryDbClient = db,
): Promise<InventoryFormOptions> {
  const [products, warehouses, locations, categories] = await Promise.all([
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
  }
}
