import {
  buildFlooringProductDisplayName,
  computeInventoryBalance,
  toInventoryFixedString,
} from "@builders/domain"
import type {
  InventoryDetail,
  InventoryFormOptions,
  InventoryImportNumberOption,
  InventoryLocationOption,
  InventoryNeighbor,
  InventoryOption,
  InventoryPurchaseOrderOption,
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
 * Normalize an inventory row into the domain read shape. Stamps the
 * computed `stockBalance` by calling the pure
 * domain helper — single source of truth for the math. Per the data-package
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
    stockBalance: toInventoryFixedString(balanceNum),
    isArchived: payload.isArchived,
    wasMerged: payload.wasMerged,
    note: payload.note ?? "",
    internalNotes: payload.internalNotes ?? "",
    inventoryItem: payload.inventoryItem,
    fifoReceivedAt: payload.fifoReceivedAt.toISOString(),
    createdAt: payload.createdAt.toISOString(),
    updatedAt: payload.updatedAt.toISOString(),
  }
}

type InventoryNeighbors = {
  previousInventory: InventoryNeighbor | null
  nextInventory: InventoryNeighbor | null
}

const NO_INVENTORY_NEIGHBORS: InventoryNeighbors = {
  previousInventory: null,
  nextInventory: null,
}

export function normalizeInventoryDetail(
  payload: InventoryDetailPayload,
  neighbors: InventoryNeighbors = NO_INVENTORY_NEIGHBORS,
): InventoryDetailRecord {
  return {
    ...normalizeInventoryRow(payload),
    inventoryAdjustments: payload.inventoryAdjustments.map(
      normalizeEnrichedInventoryAdjustmentRow,
    ),
    previousInventory: neighbors.previousInventory,
    nextInventory: neighbors.nextInventory,
  }
}

/**
 * Resolve the inventory rows immediately before/after the given numeric sort
 * key in the global inventory-number order (`inventoryNumberInt`). Powers the
 * record-view shell stepper — deliberately global: no warehouse / product /
 * archive scoping, the stepper walks the raw number line. Two single-row
 * lookups on the `inventoryNumberInt` index. Both null when the key is null
 * (no generated value yet) or the row is at the sequence's edge.
 */
async function getInventoryNeighbors(
  inventoryNumberInt: number | null,
  client: InventoryDbClient = db,
): Promise<InventoryNeighbors> {
  if (inventoryNumberInt === null) return NO_INVENTORY_NEIGHBORS

  const [previous, next] = await Promise.all([
    client.flooringInventory.findFirst({
      where: { inventoryNumberInt: { lt: inventoryNumberInt } },
      orderBy: { inventoryNumberInt: "desc" },
      select: { id: true, warehouseId: true },
    }),
    client.flooringInventory.findFirst({
      where: { inventoryNumberInt: { gt: inventoryNumberInt } },
      orderBy: { inventoryNumberInt: "asc" },
      select: { id: true, warehouseId: true },
    }),
  ])

  return {
    previousInventory: previous
      ? { id: previous.id, warehouseId: previous.warehouseId }
      : null,
    nextInventory: next ? { id: next.id, warehouseId: next.warehouseId } : null,
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

/**
 * Read the full inventory detail (row + adjustments). By default it also
 * resolves the adjacent rows for the record-view shell stepper; pass
 * `{ withNeighbors: false }` on paths that only navigate/invalidate off the
 * result (create / duplicate) to skip the two extra lookups. The record-view
 * reads — the SSR loader, the detail GET, and the primary-section save (which
 * reconciles its response into the query the stepper reads) — keep neighbors on.
 */
export async function getInventoryDetailById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: InventoryDbClient = db,
): Promise<InventoryDetailRecord | null> {
  const row = await client.flooringInventory.findUnique({
    where: { id },
    select: inventoryDetailSelect,
  })
  if (!row) return null
  const neighbors =
    options.withNeighbors === false
      ? NO_INVENTORY_NEIGHBORS
      : await getInventoryNeighbors(row.inventoryNumberInt, client)
  return normalizeInventoryDetail(row, neighbors)
}

export type InventoryBalances = Pick<
  InventoryRow,
  "stockBalance" | "netDeducted"
>

// Narrow projection used by the inventory record view to reconcile the two
// derived "balance" cells (stock balance, net deducted) after an inventory
// adjustment without refetching the full detail row.
export async function getInventoryBalancesById(
  id: string,
  client: InventoryDbClient = db,
): Promise<InventoryBalances | null> {
  const row = await client.flooringInventory.findUnique({
    where: { id },
    select: {
      startingStock: true,
      netDeducted: true,
    },
  })
  if (!row) return null

  const balanceNum = computeInventoryBalance({
    startingStock: row.startingStock.toString(),
    netDeducted: row.netDeducted.toString(),
  })

  return {
    netDeducted: toDecimalString(row.netDeducted),
    stockBalance: toInventoryFixedString(balanceNum),
  }
}

/**
 * The locked source rows a merge reads after taking the per-row `FOR UPDATE`
 * locks. Just the identity + stock columns the merge use case needs to assert
 * the single-product invariant and sum the remaining balance — no joins, no
 * normalization. Warehouse rides along only so the use case can surface it if
 * needed; the merged row's warehouse is operator-chosen, not derived from here.
 */
export type MergeSourceInventoryRow = {
  id: string
  productId: string
  warehouseId: string
  startingStock: string
  netDeducted: string
}

/**
 * Read the supplied inventory rows for a merge. Call AFTER `lockInventoryRow`
 * has locked each id in the same transaction so the product check + balance sum
 * see a stable snapshot. Returns only the rows that exist (a missing id simply
 * drops out — the use case compares counts to detect that).
 */
export async function getInventoryRowsForMerge(
  ids: string[],
  client: InventoryDbClient = db,
): Promise<MergeSourceInventoryRow[]> {
  if (ids.length === 0) return []
  const rows = await client.flooringInventory.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      productId: true,
      warehouseId: true,
      startingStock: true,
      netDeducted: true,
    },
  })
  return rows.map((row) => ({
    id: row.id,
    productId: row.productId,
    warehouseId: row.warehouseId,
    startingStock: toDecimalString(row.startingStock),
    netDeducted: toDecimalString(row.netDeducted),
  }))
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
   * Per-field identity search — one independent `ILIKE %value%` per filled bar
   * (`inventory_number` / `rollNumber` / `dyeLot` / `note`), AND'd together so
   * filling more than one narrows the result set. Mirrors the list-view read
   * path's `buildListViewWhere` semantics. Location is intentionally excluded;
   * the separate `location` arg above owns that concern.
   */
  invNumber?: string
  rollNumber?: string
  dyeLot?: string
  note?: string
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
  inventory_number: string | null
  rollNumber: string | null
  dyeLot: string | null
  note: string | null
  warehouseId: string
  location: string | null
  categorySlug: string
  stockUnitAbbrev: string | null
  startingStock: Prisma.Decimal
  netDeducted: Prisma.Decimal
}

/**
 * Picker / options search for inventory rows. Filters are AND'd: warehouse +
 * archived=false + computed-balance>0 (`startingStock > netDeducted`) +
 * (optional) product + (optional) location text contains, then per-field
 * identity ILIKEs across `inventory_number`, `rollNumber`, `dyeLot`, `note`
 * (each independent, AND'd). Balance is stamped via the same pure helper used
 * by the row normalizer (single source of truth for the math).
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
  // Per-field identity search — one independent ILIKE per filled bar, AND'd via
  // the shared `conditions` join below (mirrors `buildListViewWhere`).
  const invNumber = args.invNumber?.trim() ?? ""
  if (invNumber.length > 0) {
    conditions.push(Prisma.sql`"inventory_number" ILIKE ${`%${invNumber}%`}`)
  }
  const rollNumber = args.rollNumber?.trim() ?? ""
  if (rollNumber.length > 0) {
    conditions.push(Prisma.sql`"rollNumber" ILIKE ${`%${rollNumber}%`}`)
  }
  const dyeLot = args.dyeLot?.trim() ?? ""
  if (dyeLot.length > 0) {
    conditions.push(Prisma.sql`"dyeLot" ILIKE ${`%${dyeLot}%`}`)
  }
  const note = args.note?.trim() ?? ""
  if (note.length > 0) {
    conditions.push(Prisma.sql`"note" ILIKE ${`%${note}%`}`)
  }
  const whereClause = Prisma.join(conditions, " AND ")

  // Fetch take+1 (offset by skip) to detect a next page without a count query.
  const skip = Math.max(0, Math.floor(args.skip ?? 0))
  const rows = await client.$queryRaw<InventoryOptionRawRow[]>(Prisma.sql`
    SELECT
      "id",
      "inventoryItem",
      "inventory_number",
      "rollNumber",
      "dyeLot",
      "note",
      "warehouseId",
      "location",
      "categorySlug",
      "stockUnitAbbrev",
      "startingStock",
      "netDeducted"
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
    return {
      id: row.id,
      inventoryItem: row.inventoryItem,
      inventoryNumber: row.inventory_number,
      rollNumber: row.rollNumber,
      dyeLot: row.dyeLot,
      note: row.note,
      warehouseId: row.warehouseId,
      location: row.location,
      stockBalance: toInventoryFixedString(balanceNum),
      stockUnitAbbrev: row.stockUnitAbbrev ?? "",
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

export type InventoryPurchaseOrderSearchArgs = {
  /** Free-text identity search — `ILIKE %value%` on the PO-number column. */
  search?: string
  /** Page offset for infinite scroll. Defaults to 0. */
  skip?: number
  take: number
}

export type InventoryPurchaseOrderSearchResult = {
  items: InventoryPurchaseOrderOption[]
  hasMore: boolean
}

/**
 * Distinct import PO# snapshot values for the inventory list-view PO# filter
 * chip. Global (not warehouse-scoped) and archive-agnostic — every distinct
 * `purchaseOrderNumber` is selectable regardless of the Status chip. Excludes
 * NULL/whitespace-only values. Optional ILIKE on the search term. Sorted ASC,
 * deduped at the SQL layer.
 */
export async function searchInventoryPurchaseOrderNumbers(
  args: InventoryPurchaseOrderSearchArgs,
  client: InventoryDbClient = db,
): Promise<InventoryPurchaseOrderSearchResult> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`"purchaseOrderNumber" IS NOT NULL`,
    Prisma.sql`length(trim("purchaseOrderNumber")) > 0`,
  ]
  const trimmed = args.search?.trim() ?? ""
  if (trimmed.length > 0) {
    conditions.push(Prisma.sql`"purchaseOrderNumber" ILIKE ${`%${trimmed}%`}`)
  }
  const whereClause = Prisma.join(conditions, " AND ")

  // Fetch take+1 (offset by skip) to detect a next page without a count query.
  const skip = Math.max(0, Math.floor(args.skip ?? 0))
  const rows = await client.$queryRaw<{ purchaseOrderNumber: string }[]>(Prisma.sql`
    SELECT DISTINCT "purchaseOrderNumber"
    FROM "flooring_inventory"
    WHERE ${whereClause}
    ORDER BY "purchaseOrderNumber" ASC
    LIMIT ${args.take + 1} OFFSET ${skip}
  `)

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return { items: page.map((row) => ({ value: row.purchaseOrderNumber })), hasMore }
}

export type InventoryImportNumberSearchArgs = {
  /** Free-text identity search — `ILIKE %value%` on the import-number column. */
  search?: string
  /** Page offset for infinite scroll. Defaults to 0. */
  skip?: number
  take: number
}

export type InventoryImportNumberSearchResult = {
  items: InventoryImportNumberOption[]
  hasMore: boolean
}

/**
 * Distinct import # snapshot values for the inventory list-view Import # filter
 * chip. Global (not warehouse-scoped) and archive-agnostic — every distinct
 * `importNumber` is selectable regardless of the Status chip. Excludes
 * NULL/whitespace-only values. Optional ILIKE on the search term. Ordered
 * numerically (the column is a stringified autoincrement Int snapshot, so a
 * lexical sort would render 1, 10, 2…). Deduped at the SQL layer.
 */
export async function searchInventoryImportNumbers(
  args: InventoryImportNumberSearchArgs,
  client: InventoryDbClient = db,
): Promise<InventoryImportNumberSearchResult> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`"importNumber" IS NOT NULL`,
    Prisma.sql`length(trim("importNumber")) > 0`,
  ]
  const trimmed = args.search?.trim() ?? ""
  if (trimmed.length > 0) {
    conditions.push(Prisma.sql`"importNumber" ILIKE ${`%${trimmed}%`}`)
  }
  const whereClause = Prisma.join(conditions, " AND ")

  // Fetch take+1 (offset by skip) to detect a next page without a count query.
  // Distinct is wrapped in a subquery so the numeric (`::int`) ORDER BY is
  // valid — Postgres requires SELECT DISTINCT ordering expressions to appear in
  // the select list, which a derived cast can't.
  const skip = Math.max(0, Math.floor(args.skip ?? 0))
  const rows = await client.$queryRaw<{ importNumber: string }[]>(Prisma.sql`
    SELECT "importNumber"
    FROM (
      SELECT DISTINCT "importNumber"
      FROM "flooring_inventory"
      WHERE ${whereClause}
    ) AS sub
    ORDER BY "importNumber"::int ASC
    LIMIT ${args.take + 1} OFFSET ${skip}
  `)

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return { items: page.map((row) => ({ value: row.importNumber })), hasMore }
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
    })),
    warehouses,
    categories,
  }
}
