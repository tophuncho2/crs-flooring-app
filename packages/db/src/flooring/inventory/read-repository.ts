import {
  buildFlooringProductDisplayName,
  computeInventoryBalance,
  computeInventoryCoverage,
  toInventoryFixedString,
} from "@builders/domain"
import type {
  InventoryDetail,
  InventoryFormOptions,
  InventoryImportNumberOption,
  InventoryLocationOption,
  InventoryOption,
  InventoryPurchaseOrderOption,
  InventoryRow,
} from "@builders/domain"
import { Prisma } from "../../generated/prisma/client.js"
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
     * Import-number snapshot match (`flooring_inventory.importNumber` = the
     * stringified `Int` stamped at materialize time). Filters rows whose
     * snapshot equals any value in the array.
     */
    importNumber?: ReadonlyArray<string>
    /** Purchase-order-number snapshot match (same shape as `importNumber`). */
    purchaseOrderNumber?: ReadonlyArray<string>
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

  const importNumbers = options.filters?.importNumber
  if (importNumbers && importNumbers.length > 0) {
    clauses.push({ importNumber: { in: [...importNumbers] } })
  }

  const purchaseOrderNumbers = options.filters?.purchaseOrderNumber
  if (purchaseOrderNumbers && purchaseOrderNumbers.length > 0) {
    clauses.push({ purchaseOrderNumber: { in: [...purchaseOrderNumbers] } })
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

type InventoryOptionRawRow = {
  id: string
  inventoryItem: string
  warehouseId: string
  location: string | null
  categorySlug: string
  stockUnitAbbrev: string | null
  itemCoverageUnitAbbrev: string | null
  startingStock: Prisma.Decimal
  totalCutSum: Prisma.Decimal
  coveragePerUnit: Prisma.Decimal | null
}

/**
 * Picker / options search for inventory rows. Filters are AND'd: warehouse +
 * archived=false + computed-balance>0 (`startingStock > totalCutSum`) +
 * (optional) product + (optional) location text contains, then identity-OR
 * across `inventoryNumber`, `rollNumber`, `dyeLot`, `note`. Balance + coverage
 * are stamped via the same pure helpers used by the row normalizer (single
 * source of truth for the math) — coverage is null for non-coverage categories.
 *
 * Built on `$queryRaw` so the column-to-column compare for the
 * positive-balance constraint can live in SQL — Prisma's typed `where` cannot
 * compare two columns of the same row.
 */
export async function searchInventoryOptions(
  args: InventoryOptionsSearchArgs,
  client: InventoryDbClient = db,
): Promise<InventoryOption[]> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`"warehouseId" = ${args.warehouseId}`,
    Prisma.sql`"isArchived" = false`,
    Prisma.sql`"startingStock" > "totalCutSum"`,
  ]
  if (args.productId !== undefined) {
    conditions.push(Prisma.sql`"productId" = ${args.productId}`)
  }
  const locationFilter = args.location?.trim() ?? ""
  if (locationFilter.length > 0) {
    conditions.push(Prisma.sql`"location" ILIKE ${`%${locationFilter}%`}`)
  }
  const trimmed = args.search?.trim() ?? ""
  if (trimmed.length > 0) {
    const pattern = `%${trimmed}%`
    conditions.push(
      Prisma.sql`("inventory_number" ILIKE ${pattern} OR "rollNumber" ILIKE ${pattern} OR "dyeLot" ILIKE ${pattern} OR "note" ILIKE ${pattern})`,
    )
  }
  const whereClause = Prisma.join(conditions, " AND ")

  const rows = await client.$queryRaw<InventoryOptionRawRow[]>(Prisma.sql`
    SELECT
      "id",
      "inventoryItem",
      "warehouseId",
      "location",
      "categorySlug",
      "stockUnitAbbrev",
      "itemCoverageUnitAbbrev",
      "startingStock",
      "totalCutSum",
      "coveragePerUnit"
    FROM "flooring_inventory"
    WHERE ${whereClause}
    ORDER BY "inventory_number" ASC
    LIMIT ${args.take}
  `)

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

export type InventoryLocationsSearchArgs = {
  warehouseId: string
  /** Free-text identity search — `ILIKE %value%` on the location column. */
  search?: string
  take: number
}

/**
 * Distinct, warehouse-scoped location values for the cut-log create form's
 * LocationPicker. Excludes archived rows + NULL/whitespace-only locations.
 * Optional ILIKE on the search term. Sorted ASC, deduped at the SQL layer.
 */
export async function searchInventoryLocationsForWarehouse(
  args: InventoryLocationsSearchArgs,
  client: InventoryDbClient = db,
): Promise<InventoryLocationOption[]> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`"warehouseId" = ${args.warehouseId}`,
    Prisma.sql`"isArchived" = false`,
    Prisma.sql`"location" IS NOT NULL`,
    Prisma.sql`length(trim("location")) > 0`,
  ]
  const trimmed = args.search?.trim() ?? ""
  if (trimmed.length > 0) {
    conditions.push(Prisma.sql`"location" ILIKE ${`%${trimmed}%`}`)
  }
  const whereClause = Prisma.join(conditions, " AND ")

  const rows = await client.$queryRaw<{ location: string }[]>(Prisma.sql`
    SELECT DISTINCT "location"
    FROM "flooring_inventory"
    WHERE ${whereClause}
    ORDER BY "location" ASC
    LIMIT ${args.take}
  `)

  return rows.map((row) => ({ value: row.location }))
}

export type InventoryImportNumberOptionsSearchArgs = {
  warehouseId: string
  /**
   * Optional archive scope — mirrors `InventoryListFilter.isArchived`.
   *   undefined → both (no archive filter applied)
   *   true      → archived rows only
   *   false     → active rows only
   * Passed through from the inventory list's archive segmented control so the
   * chip surfaces only values that exist within the current list scope.
   */
  isArchived?: boolean
  /** Free-text identity search — `ILIKE %value%` on the snapshot column. */
  search?: string
  take: number
}

/**
 * Distinct, warehouse-scoped `importNumber` snapshot values for the inventory
 * list's Import # filter chip. Sourced from `flooring_inventory` (not from
 * `FlooringImportEntry`) so the chip only ever surfaces values that have at
 * least one inventory row in scope. Excludes NULL/whitespace-only snapshots.
 * Sorted DESC so the newest imports surface first.
 */
export async function searchInventoryImportNumberOptions(
  args: InventoryImportNumberOptionsSearchArgs,
  client: InventoryDbClient = db,
): Promise<InventoryImportNumberOption[]> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`"warehouseId" = ${args.warehouseId}`,
    Prisma.sql`"importNumber" IS NOT NULL`,
    Prisma.sql`length(trim("importNumber")) > 0`,
  ]
  if (args.isArchived !== undefined) {
    conditions.push(Prisma.sql`"isArchived" = ${args.isArchived}`)
  }
  const trimmed = args.search?.trim() ?? ""
  if (trimmed.length > 0) {
    conditions.push(Prisma.sql`"importNumber" ILIKE ${`%${trimmed}%`}`)
  }
  const whereClause = Prisma.join(conditions, " AND ")

  // Cast to int for numeric DESC ordering so "10" sorts after "9" rather than
  // before. The snapshot column is text, but every value is a positive integer
  // mirrored from `FlooringImportEntry.importNumber`. Postgres requires
  // ORDER BY expressions to appear in the SELECT list when SELECT DISTINCT is
  // used — selecting the cast alongside the value satisfies that rule, and the
  // pair stays 1:1 with distinct values (sort_key is a function of importNumber).
  const rows = await client.$queryRaw<{ importNumber: string; sort_key: number }[]>(Prisma.sql`
    SELECT DISTINCT "importNumber", ("importNumber")::int AS sort_key
    FROM "flooring_inventory"
    WHERE ${whereClause}
    ORDER BY sort_key DESC
    LIMIT ${args.take}
  `)

  return rows.map((row) => ({ importNumber: row.importNumber }))
}

export type InventoryPurchaseOrderOptionsSearchArgs = {
  warehouseId: string
  isArchived?: boolean
  search?: string
  take: number
}

/**
 * Distinct, warehouse-scoped `purchaseOrderNumber` snapshot values for the
 * inventory list's PO # filter chip. Same shape as
 * `searchInventoryImportNumberOptions` but on the PO snapshot column.
 * Excludes NULL/whitespace-only snapshots so the chip never offers an empty
 * selection. Sorted ASC (POs are arbitrary alphanumeric strings).
 */
export async function searchInventoryPurchaseOrderOptions(
  args: InventoryPurchaseOrderOptionsSearchArgs,
  client: InventoryDbClient = db,
): Promise<InventoryPurchaseOrderOption[]> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`"warehouseId" = ${args.warehouseId}`,
    Prisma.sql`"purchaseOrderNumber" IS NOT NULL`,
    Prisma.sql`length(trim("purchaseOrderNumber")) > 0`,
  ]
  if (args.isArchived !== undefined) {
    conditions.push(Prisma.sql`"isArchived" = ${args.isArchived}`)
  }
  const trimmed = args.search?.trim() ?? ""
  if (trimmed.length > 0) {
    conditions.push(Prisma.sql`"purchaseOrderNumber" ILIKE ${`%${trimmed}%`}`)
  }
  const whereClause = Prisma.join(conditions, " AND ")

  const rows = await client.$queryRaw<{ purchaseOrderNumber: string }[]>(Prisma.sql`
    SELECT DISTINCT "purchaseOrderNumber"
    FROM "flooring_inventory"
    WHERE ${whereClause}
    ORDER BY "purchaseOrderNumber" ASC
    LIMIT ${args.take}
  `)

  return rows.map((row) => ({ purchaseOrderNumber: row.purchaseOrderNumber }))
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
