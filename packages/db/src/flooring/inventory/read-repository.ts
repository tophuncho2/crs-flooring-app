import {
  buildFlooringProductDisplayName,
  computeInventoryBalance,
  computeInventoryCoverage,
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

/**
 * Normalize an inventory row into the domain read shape. Stamps the two
 * computed fields (`stockBalance`, `coverageBalance`) by calling the pure
 * domain helpers — single source of truth for the math. Per the data-package
 * carve-out, this is a data-layer normalizer reusing pure domain
 * formatters/computations; it MUST NOT call domain rules that throw.
 *
 * Snapshot columns (`productName`, `categoryName`, `importNumber`,
 * `purchaseOrderNumber`, `inventoryItem`) are surfaced as-is; the worker
 * writes them at materialize time and the inventory update use case
 * recomputes `inventoryItem` whenever a source field changes.
 */
export function normalizeInventoryRow(payload: InventoryRowPayload): InventoryRecord {
  // Read the categorySlug snapshot column, not the joined product.category.slug.
  // The snapshot is stamped at worker-create time and is immutable thereafter;
  // the product's category can no longer change while inventory exists (see
  // isProductCategoryChangeBlocked).
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

  return {
    id: payload.id,
    inventoryNumber: payload.inventoryNumber,
    importEntryId: payload.importEntryId ?? "",
    importNumber: payload.importNumber ?? "",
    purchaseOrderNumber: payload.purchaseOrderNumber ?? "",
    productId: payload.productId,
    productName: payload.productName,
    categoryId: payload.product.category.id,
    categoryName: payload.categoryName,
    categorySlug,
    stockUnitName: payload.stockUnitName ?? "",
    stockUnitAbbrev: payload.stockUnitAbbrev ?? "",
    itemCoverageUnitName: payload.itemCoverageUnitName ?? "",
    itemCoverageUnitAbbrev: payload.itemCoverageUnitAbbrev ?? "",
    sendUnitName: payload.sendUnitName ?? "",
    sendUnitAbbrev: payload.sendUnitAbbrev ?? "",
    rollPrefix: payload.rollPrefix,
    rollNumber: payload.rollNumber ?? "",
    dyeLot: payload.dyeLot ?? "",
    warehouseId: payload.warehouseId,
    warehouseName: payload.warehouse.name,
    warehouseNumber: String(payload.warehouse.number),
    location: payload.location ?? "",
    startingStock: toDecimalString(payload.startingStock),
    totalCutSum: toDecimalString(payload.totalCutSum),
    coveragePerUnit: toDecimalString(payload.coveragePerUnit),
    stockBalance: toInventoryFixedString(balanceNum),
    coverageBalance: coverageNum === null ? "" : toInventoryFixedString(coverageNum),
    isArchived: payload.isArchived,
    note: payload.note ?? "",
    internalNotes: payload.internalNotes ?? "",
    inventoryItem: payload.inventoryItem,
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
    orderBy: [{ fifoReceivedAt: "asc" }, { rollNumber: "asc" }, { id: "asc" }],
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
    location?: string
    categoryId?: ReadonlyArray<string>
    productId?: ReadonlyArray<string>
    /**
     * `true` = show archived, `false` = hide archived. When undefined the
     * default is "hide archived" — the list view defaults to not showing
     * archived rows; users opt in via a filter chip.
     */
    isArchived?: boolean
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
  const archivedFilter = options.filters?.isArchived
  const clauses: Prisma.FlooringInventoryWhereInput[] = []
  // Default to hiding archived rows. Users can opt in by passing
  // `isArchived: true` (show only archived) or by passing `undefined` is
  // treated as "hide" — to show ALL rows the controller can pass an explicit
  // override but the canonical UI flow is two-state (hide / show).
  if (archivedFilter === true) {
    clauses.push({ isArchived: true })
  } else {
    clauses.push({ isArchived: false })
  }

  // Server-side search targets identity columns only — `inventoryNumber`,
  // `rollNumber`, `dyeLot`, `note`. Location is intentionally excluded; it
  // has its own dedicated filter chip on the list view. Searching against
  // the raw columns (instead of the denormalized `inventoryItem` blob)
  // keeps the "where is it" concern out of the "what is it" search.
  const trimmed = options.search?.trim() ?? ""
  if (trimmed.length > 0) {
    const ilike = { contains: trimmed, mode: "insensitive" as const }
    clauses.push({
      OR: [
        { inventoryNumber: ilike },
        { rollNumber: ilike },
        { dyeLot: ilike },
        { note: ilike },
      ],
    })
  }

  const warehouseIds = options.filters?.warehouseId
  if (warehouseIds && warehouseIds.length > 0) {
    clauses.push({ warehouseId: { in: [...warehouseIds] } })
  }

  // Free-text location filter chip — independent from the identity search
  // above. Location is owned by this filter; the search bar deliberately
  // does NOT match it.
  const locationFilter = options.filters?.location?.trim() ?? ""
  if (locationFilter.length > 0) {
    clauses.push({ location: { contains: locationFilter, mode: "insensitive" } })
  }

  // categoryId narrows via product.categoryId.
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
 * tiebreak. Filters AND together; search ILIKEs across the identity columns
 * (`inventoryNumber`, `rollNumber`, `dyeLot`, `note`) only — location lives
 * on its own filter chip. Archived rows hidden by default.
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
  /** Free-text location filter chip — `ILIKE %value%` on the location column. */
  location?: string
  /**
   * Free-text identity search — ILIKEs across `inventoryNumber`,
   * `rollNumber`, `dyeLot`, `note`. Location is intentionally excluded; the
   * separate `location` arg above owns that concern.
   */
  search?: string
  take: number
}

/**
 * Picker / options search for inventory rows. Filters are AND'd: warehouse +
 * (optional) product + (optional) location text contains, then identity-OR
 * across `inventoryNumber`, `rollNumber`, `dyeLot`, `note`. Archived rows
 * excluded. Balance + coverage are stamped via the same pure helpers used by
 * the row normalizer (single source of truth for the math) — coverage is
 * null for non-coverage categories.
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

  const locationFilter = args.location?.trim() ?? ""
  if (locationFilter.length > 0) {
    where.location = { contains: locationFilter, mode: "insensitive" }
  }

  const trimmed = args.search?.trim() ?? ""
  if (trimmed.length > 0) {
    const ilike = { contains: trimmed, mode: "insensitive" as const }
    where.OR = [
      { inventoryNumber: ilike },
      { rollNumber: ilike },
      { dyeLot: ilike },
      { note: ilike },
    ]
  }

  const rows = await client.flooringInventory.findMany({
    where,
    select: {
      id: true,
      inventoryItem: true,
      warehouseId: true,
      location: true,
      categorySlug: true,
      stockUnitAbbrev: true,
      itemCoverageUnitAbbrev: true,
      startingStock: true,
      totalCutSum: true,
      coveragePerUnit: true,
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
      inventoryItem: row.inventoryItem,
      warehouseId: row.warehouseId,
      location: row.location,
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
  const [products, warehouses, categories] = await Promise.all([
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
    categories,
  }
}
