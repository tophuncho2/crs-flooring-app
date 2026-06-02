import {
  buildFlooringProductDisplayName,
  computeInventoryBalance,
  computeInventoryCoverage,
  toInventoryFixedString,
} from "@builders/domain"
import type {
  InventoryDetail,
  InventoryFormOptions,
  InventoryLocationOption,
  InventoryOption,
  InventoryRow,
} from "@builders/domain"
import { Prisma } from "../../generated/prisma/client.js"
import { db } from "../../client.js"
import { normalizeEnrichedInventoryAdjustmentRow } from "./adjustments/read-repository.js"
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
 * Snapshot columns (`categoryName`, `importNumber`, `purchaseOrderNumber`,
 * `inventoryItem`) are surfaced as-is; the worker writes them at materialize
 * time and the inventory update use case recomputes `inventoryItem` whenever a
 * source field changes. `productName` is the exception — it is now derived from
 * the live `product` join (not the snapshot column) so product edits propagate.
 */
export function normalizeInventoryRow(payload: InventoryRowPayload): InventoryRecord {
  // Read the categorySlug snapshot column, not the joined product.category.slug.
  // The snapshot is stamped at worker-create time and is immutable thereafter;
  // the product's category can no longer change while inventory exists (see
  // isProductCategoryChangeBlocked).
  const categorySlug = payload.categorySlug
  const balanceNum = computeInventoryBalance({
    startingStock: payload.startingStock.toString(),
    netDeducted: payload.netDeducted.toString(),
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
    // Live product label via the joined product (style/color fall back to the
    // composed name). The `productName` snapshot column has been dropped; the
    // label is derived here so a product edit flows through to every inventory
    // surface.
    productName: buildFlooringProductDisplayName({
      name: payload.product.name,
      style: payload.product.style,
      color: payload.product.color,
    }),
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
    netDeducted: toDecimalString(payload.netDeducted),
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
    inventoryAdjustments: payload.inventoryAdjustments.map(
      normalizeEnrichedInventoryAdjustmentRow,
    ),
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

export type InventoryBalances = Pick<
  InventoryRow,
  "stockBalance" | "netDeducted" | "coverageBalance"
>

// Narrow projection used by the inventory record view to reconcile the three
// derived "balance" cells (stock balance, net deducted, coverage balance)
// after an inventory adjustment without refetching the full detail row.
export async function getInventoryBalancesById(
  id: string,
  client: InventoryDbClient = db,
): Promise<InventoryBalances | null> {
  const row = await client.flooringInventory.findUnique({
    where: { id },
    select: {
      startingStock: true,
      netDeducted: true,
      coveragePerUnit: true,
      categorySlug: true,
    },
  })
  if (!row) return null

  const balanceNum = computeInventoryBalance({
    startingStock: row.startingStock.toString(),
    netDeducted: row.netDeducted.toString(),
  })
  const coverageNum = computeInventoryCoverage({
    balance: balanceNum,
    coveragePerUnit:
      row.coveragePerUnit === null ? null : row.coveragePerUnit.toString(),
    categorySlug: row.categorySlug,
  })

  return {
    netDeducted: toDecimalString(row.netDeducted),
    stockBalance: toInventoryFixedString(balanceNum),
    coverageBalance: coverageNum === null ? "" : toInventoryFixedString(coverageNum),
  }
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
): Promise<{
  hasInventoryAdjustments: boolean
  inventoryAdjustmentsCount: number
  sourceStagedRowId: string | null
} | null> {
  const row = await client.flooringInventory.findUnique({
    where: { id },
    select: {
      sourceStagedRowId: true,
      _count: { select: { inventoryAdjustments: true } },
    },
  })
  if (!row) return null
  const inventoryAdjustmentsCount = row._count.inventoryAdjustments
  return {
    hasInventoryAdjustments: inventoryAdjustmentsCount > 0,
    inventoryAdjustmentsCount,
    sourceStagedRowId: row.sourceStagedRowId,
  }
}

export async function countInventoriesByProductId(
  productId: string,
  client: InventoryDbClient = db,
): Promise<number> {
  return client.flooringInventory.count({ where: { productId } })
}

// --- List view read (paginated, server-side filtered) ---

export type InventoryListViewOptions = {
  filters?: {
    warehouseId?: ReadonlyArray<string>
    location?: string
    categoryId?: ReadonlyArray<string>
    productId?: ReadonlyArray<string>
    /**
     * Per-field identity search — the four list-view search bars. Each is an
     * independent case-insensitive substring (ILIKE) match against its own
     * column; multiple set fields AND together to narrow. Backed by the
     * per-column trigram indexes on `flooring_inventory`.
     */
    invNumber?: string
    rollNumber?: string
    dyeLot?: string
    note?: string
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
  options: Pick<InventoryListViewOptions, "filters">,
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

  // Per-field identity search — one independent ILIKE per filled search bar
  // (`inventoryNumber`/`rollNumber`/`dyeLot`/`note`). Each pushes its own AND
  // clause so filling more than one bar narrows the result set. Location is
  // intentionally excluded; it has its own dedicated filter chip. Matching the
  // raw columns (instead of the denormalized `inventoryItem` blob) keeps the
  // "where is it" concern out of the "what is it" search.
  const invNumber = options.filters?.invNumber?.trim() ?? ""
  if (invNumber.length > 0) {
    clauses.push({ inventoryNumber: { contains: invNumber, mode: "insensitive" } })
  }
  const rollNumber = options.filters?.rollNumber?.trim() ?? ""
  if (rollNumber.length > 0) {
    clauses.push({ rollNumber: { contains: rollNumber, mode: "insensitive" } })
  }
  const dyeLot = options.filters?.dyeLot?.trim() ?? ""
  if (dyeLot.length > 0) {
    clauses.push({ dyeLot: { contains: dyeLot, mode: "insensitive" } })
  }
  const note = options.filters?.note?.trim() ?? ""
  if (note.length > 0) {
    clauses.push({ note: { contains: note, mode: "insensitive" } })
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
 * `inventoryNumberInt ASC` — a flat ascending inventory-number order across
 * all products (no product grouping). The int sort key is the stored
 * generated column derived from `inventoryNumber`'s numeric tail, which
 * avoids the lex-vs-numeric trap of the unpadded string format (`INV-10` <
 * `INV-2` lexically). `id ASC` is the stable tiebreak. Users are responsible
 * for archiving spent rows so the list stays scoped to live inventory.
 * Filters AND together — including the per-field identity search bars, each an
 * independent ILIKE on its own column (`inventoryNumber`, `rollNumber`,
 * `dyeLot`, `note`). Location lives on its own filter chip. Archived rows
 * hidden by default.
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
    { inventoryNumberInt: "asc" },
    { id: "asc" },
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
  /** Page offset for infinite scroll. Defaults to 0. */
  skip?: number
  take: number
}

export type InventoryOptionsSearchResult = {
  items: InventoryOption[]
  hasMore: boolean
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
  netDeducted: Prisma.Decimal
  coveragePerUnit: Prisma.Decimal | null
}

/**
 * Picker / options search for inventory rows. Filters are AND'd: warehouse +
 * archived=false + computed-balance>0 (`startingStock > netDeducted`) +
 * (optional) product + (optional) location text contains, then identity-OR
 * across `inventoryNumber`, `rollNumber`, `dyeLot`, `note`. Balance + coverage
 * are stamped via the same pure helpers used by the row normalizer (single
 * source of truth for the math) — coverage is null for non-coverage categories.
 * Results are ordered `inventoryNumberInt ASC` (a flat ascending
 * inventory-number order across all products, via the stored generated int
 * column), matching the inventory list view's sort and avoiding the
 * lex-vs-numeric trap of the unpadded string format.
 *
 * Built on `$queryRaw` so the column-to-column compare for the
 * positive-balance constraint can live in SQL — Prisma's typed `where` cannot
 * compare two columns of the same row.
 */
export async function searchInventoryOptions(
  args: InventoryOptionsSearchArgs,
  client: InventoryDbClient = db,
): Promise<InventoryOptionsSearchResult> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`"warehouseId" = ${args.warehouseId}`,
    Prisma.sql`"isArchived" = false`,
    Prisma.sql`"startingStock" > "netDeducted"`,
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

  // Fetch take+1 (offset by skip) to detect a next page without a count query.
  const skip = Math.max(0, Math.floor(args.skip ?? 0))
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
      "netDeducted",
      "coveragePerUnit"
    FROM "flooring_inventory"
    WHERE ${whereClause}
    ORDER BY "inventoryNumberInt" ASC, "id" ASC
    LIMIT ${args.take + 1} OFFSET ${skip}
  `)

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  const items = page.map((row) => {
    const balanceNum = computeInventoryBalance({
      startingStock: row.startingStock.toString(),
      netDeducted: row.netDeducted.toString(),
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

  return { items, hasMore }
}

export type InventoryLocationsSearchArgs = {
  warehouseId: string
  /** Free-text identity search — `ILIKE %value%` on the location column. */
  search?: string
  /** Page offset for infinite scroll. Defaults to 0. */
  skip?: number
  take: number
}

export type InventoryLocationsSearchResult = {
  items: InventoryLocationOption[]
  hasMore: boolean
}

/**
 * Distinct, warehouse-scoped location values for the cut-log create form's
 * LocationPicker. Excludes archived rows + NULL/whitespace-only locations.
 * Optional ILIKE on the search term. Sorted ASC, deduped at the SQL layer.
 */
export async function searchInventoryLocationsForWarehouse(
  args: InventoryLocationsSearchArgs,
  client: InventoryDbClient = db,
): Promise<InventoryLocationsSearchResult> {
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

  // Fetch take+1 (offset by skip) to detect a next page without a count query.
  const skip = Math.max(0, Math.floor(args.skip ?? 0))
  const rows = await client.$queryRaw<{ location: string }[]>(Prisma.sql`
    SELECT DISTINCT "location"
    FROM "flooring_inventory"
    WHERE ${whereClause}
    ORDER BY "location" ASC
    LIMIT ${args.take + 1} OFFSET ${skip}
  `)

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return { items: page.map((row) => ({ value: row.location })), hasMore }
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
