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
  InventoryPurchaseOrderOption,
  InventoryRow,
} from "@builders/domain"
import { Prisma } from "../generated/prisma/client.js"
import { db } from "../client.js"
import { resolveNumberNeighbors } from "../shared/number-neighbors.js"
import { exactNumberIntEquals } from "../shared/exact-number-search.js"
import { sliceHasMore } from "../shared/paginate.js"
import { combineAnd } from "../shared/where.js"
import { normalizeEnrichedInventoryAdjustmentRow } from "./adjustments/read-repository.js"
import { resolveConversion } from "./conversion.js"
import {
  inventoryDetailSelect,
  inventoryRowSelect,
  type InventoryDbClient,
  type InventoryDetailPayload,
  type InventoryRowPayload,
} from "./shared.js"
import { buildInventoryListViewOrderBy } from "./order-by.js"

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

/** Coerce a Prisma `_sum` Decimal (null when no rows matched) to a number for
 *  the money/quantity formatters. */
function decimalToNumber(value: { toNumber(): number } | null | undefined): number {
  return value === null || value === undefined ? 0 : value.toNumber()
}

/**
 * Normalize an inventory row into the domain read shape. Stamps the
 * computed `stockBalance` by calling the pure
 * domain helper — single source of truth for the math. Per the data-package
 * carve-out, this is a data-layer normalizer reusing pure domain
 * formatters/computations; it MUST NOT call domain rules that throw.
 *
 * `importNumber` and `purchaseOrderNumber` are derived from the live
 * `importEntry` join (their snapshot columns have been dropped) so they always
 * reflect the linked import — including PO# edits made after materialize.
 * `productName` is likewise derived from the live `product` join (not a snapshot
 * column) so product edits propagate.
 */
export function normalizeInventoryRow(payload: InventoryRowPayload): InventoryRecord {
  const balanceNum = computeInventoryBalance({
    startingStock: payload.startingStock.toString(),
    netDeducted: payload.netDeducted.toString(),
  })
  const stockBalance = toInventoryFixedString(balanceNum)
  const coveragePerUnit = toDecimalString(payload.coveragePerUnit)
  // convertedStockBalance + the target-unit labels are DERIVED here (never
  // stored) off the live stock balance and the linked formula.
  const conversion = resolveConversion({
    formula: payload.conversionFormula,
    rowUnitId: payload.unitId,
    coveragePerUnit,
    balance: stockBalance,
  })

  return {
    id: payload.id,
    inventoryNumber: payload.inventoryNumber,
    importEntryId: payload.importEntryId ?? "",
    importNumber: payload.importEntry?.importNumber ?? null,
    purchaseOrderNumber: payload.importEntry?.purchaseOrderNumber ?? "",
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
    unitId: payload.unitId,
    // Unit display derives solely from the FK join (UoM epic 2B) — a UoM rename
    // flows through. Snapshot columns are fully de-referenced (2D drops them).
    unitName: payload.unit?.name ?? "",
    unitAbbrev: payload.unit?.abbreviation ?? "",
    rollPrefix: payload.rollPrefix,
    rollNumber: payload.rollNumber ?? "",
    dyeLot: payload.dyeLot ?? "",
    warehouseId: payload.warehouseId,
    warehouseName: payload.warehouse.name,
    location: payload.location ?? "",
    startingStock: toDecimalString(payload.startingStock),
    cost: toDecimalString(payload.cost),
    freight: toDecimalString(payload.freight),
    netDeducted: toDecimalString(payload.netDeducted),
    stockBalance,
    coverageUnitId: payload.coverageUnitId ?? "",
    coverageUnitName: payload.coverageUnit?.name ?? "",
    coverageUnitAbbrev: payload.coverageUnit?.abbreviation ?? "",
    coveragePerUnit,
    conversionFormulaId: payload.conversionFormulaId ?? "",
    conversionFormulaName: conversion.conversionFormulaName,
    convertedStockBalance: conversion.convertedBalance,
    conversionUnitName: conversion.conversionUnitName,
    conversionUnitAbbrev: conversion.conversionUnitAbbrev,
    isArchived: payload.isArchived,
    note: payload.note ?? "",
    internalNotes: payload.internalNotes ?? "",
    color: payload.color,
    createdAt: payload.createdAt.toISOString(),
    updatedAt: payload.updatedAt.toISOString(),
    createdBy: payload.createdBy ?? null,
    updatedBy: payload.updatedBy ?? null,
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
  const { previous, next } = await resolveNumberNeighbors(
    "inventoryNumberInt",
    inventoryNumberInt,
    (q) =>
      client.flooringInventory.findFirst({
        ...q,
        select: { id: true, warehouseId: true },
      }),
  )

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
    orderBy: [{ createdAt: "asc" }, { rollNumber: "asc" }, { id: "asc" }],
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

export async function getInventoryDeleteState(
  id: string,
  client: InventoryDbClient = db,
): Promise<{
  hasInventoryAdjustments: boolean
  inventoryAdjustmentsCount: number
} | null> {
  const row = await client.flooringInventory.findUnique({
    where: { id },
    select: {
      _count: { select: { inventoryAdjustments: true } },
    },
  })
  if (!row) return null
  const inventoryAdjustmentsCount = row._count.inventoryAdjustments
  return {
    hasInventoryAdjustments: inventoryAdjustmentsCount > 0,
    inventoryAdjustmentsCount,
  }
}

// --- List view read (paginated, server-side filtered) ---

export type InventoryListViewOptions = {
  filters?: {
    /**
     * Restrict to an explicit set of inventory row ids — the export "selected
     * rows" scope. ANDs with every other filter (including the always-on
     * archived/merged gates), so a ticked row that no longer matches the active
     * filters is excluded. Absent on the normal list read.
     */
    id?: ReadonlyArray<string>
    warehouseId?: ReadonlyArray<string>
    location?: string
    categoryId?: ReadonlyArray<string>
    productId?: ReadonlyArray<string>
    /**
     * Per-field identity search — the four list-view search bars; multiple set
     * fields AND together to narrow. `rollNumber`/`dyeLot`/`note` are
     * case-insensitive substring (ILIKE) matches backed by the per-column
     * trigram indexes. `invNumber` is the exception: an EXACT match on the
     * generated `inventoryNumberInt` (btree), so "12" finds INV-12 only — see
     * `buildListViewWhere`.
     */
    invNumber?: string
    rollNumber?: string
    dyeLot?: string
    note?: string
    /**
     * Import-number match. Resolved through the `importEntry` relation
     * (`flooring_import_entry.importNumber`, an `Int`) — the inventory snapshot
     * column has been dropped. Chip values arrive as strings; rows whose linked
     * import number equals any parseable value in the array are kept.
     */
    importNumber?: ReadonlyArray<string>
    /**
     * Purchase-order-number match. Resolved through the `importEntry` relation
     * (`flooring_import_entry.purchaseOrderNumber`) — the inventory snapshot
     * column has been dropped. Filters rows whose linked import PO# equals any
     * value in the array.
     */
    purchaseOrderNumber?: ReadonlyArray<string>
    /**
     * `true` = show archived, `false` = hide archived. When undefined the
     * default is "hide archived" — the list view defaults to not showing
     * archived rows; users opt in via a filter chip.
     */
    isArchived?: boolean
  }
  sort?: InventoryListViewSort
  skip: number
  take: number
}

export type InventoryListViewSortEntry = {
  /**
   * Sort column. `createdAt` (the default) falls through to the tiebreaker;
   * `location` is nullable so it is ordered explicitly with nulls last;
   * `stockBalance` (the displayed quantity) sorts on the generated
   * `stockQuantity` column. Row# (`inventoryNumber`) is intentionally not
   * sortable.
   */
  field: string
  direction: "asc" | "desc"
}

export type InventoryListViewSort = {
  /** Ordered sort columns, highest priority first. */
  entries: InventoryListViewSortEntry[]
}

export type InventoryListViewResult = {
  rows: InventoryRecord[]
  total: number
  /**
   * Column rollups over the full filtered set (every row matching `where`, not
   * just the page): `stockBalance` sums the stored generated `stockQuantity`
   * column (`GREATEST(startingStock - netDeducted, 0)`), so it exactly matches
   * the per-row displayed balance; `netDeducted`/`startingStock` sum their raw
   * columns. Display-ready fixed strings for the pinned footer.
   */
  totals: {
    stockBalance: string
    netDeducted: string
    startingStock: string
  }
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

  // Explicit id scope — the export "selected rows" path. ANDs with the gates
  // above, so a ticked row that has since been archived or filtered out
  // is silently excluded (acceptable: ticks originate from the filtered list).
  const ids = options.filters?.id
  if (ids && ids.length > 0) {
    clauses.push({ id: { in: [...ids] } })
  }

  // Per-field identity search — one independent clause per filled search bar
  // (`inventoryNumber`/`rollNumber`/`dyeLot`/`note`). Each pushes its own AND
  // clause so filling more than one bar narrows the result set. Location is
  // intentionally excluded; it has its own dedicated filter chip. Matching the
  // raw identity columns keeps the "where is it" concern out of the
  // "what is it" search.
  //
  // `inventoryNumber` is the exception: it is an EXACT match on the numeric
  // value (not a substring) — the # bar finds the one row, so "12" matches
  // INV-12 only, never INV-120 / INV-312. We match the generated integer column
  // `inventoryNumberInt` (btree-indexed), which also lets the user type bare
  // ("12") or prefixed ("INV-12") — non-digits are stripped. A non-numeric query
  // matches nothing (sentinel -1; the inventory-number sequence is always
  // positive). `rollNumber`/`dyeLot`/`note` stay substring ILIKE.
  const invNumber = options.filters?.invNumber?.trim() ?? ""
  if (invNumber.length > 0) {
    clauses.push({ inventoryNumberInt: exactNumberIntEquals(invNumber) })
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
    // Import number lives on the linked import entry (the inventory snapshot
    // column was dropped). Chip values are strings; coerce to the entry's Int
    // and filter through the relation.
    const nums = importNumbers.map(Number).filter(Number.isInteger)
    if (nums.length > 0) {
      clauses.push({ importEntry: { is: { importNumber: { in: nums } } } })
    }
  }

  const purchaseOrderNumbers = options.filters?.purchaseOrderNumber
  if (purchaseOrderNumbers && purchaseOrderNumbers.length > 0) {
    // PO# lives on the linked import entry (the inventory snapshot column was
    // dropped); filter through the relation.
    clauses.push({
      importEntry: { is: { purchaseOrderNumber: { in: [...purchaseOrderNumbers] } } },
    })
  }

  return combineAnd(clauses)
}


/**
 * Server-side paginated read for the inventory list view. Default sort is
 * `createdAt DESC` — newest rows first — with `id` as the stable tiebreak.
 * Users can re-sort by `createdAt`, `location`, or `stockBalance` (quantity)
 * via the column headers; row# is intentionally not sortable. See
 * {@link buildInventoryListViewOrderBy}. Users are responsible for archiving
 * spent rows so the list stays scoped to live inventory.
 * Filters AND together — including the per-field identity search bars:
 * `inventoryNumber` is an exact numeric match (`inventoryNumberInt`), while
 * `rollNumber`/`dyeLot`/`note` are independent ILIKEs on their own columns.
 * Location lives on its own filter chip. Archived rows hidden by default.
 *
 * Lives alongside `listInventory(filter?)` which is still used by the imports
 * record view's "live rows" section to fetch all rows for a given import.
 */
export async function listInventoryForListView(
  options: InventoryListViewOptions,
  client: InventoryDbClient = db,
): Promise<InventoryListViewResult> {
  const where = buildListViewWhere(options)
  const orderBy = buildInventoryListViewOrderBy(options.sort)

  const [total, rows, aggregate] = await Promise.all([
    client.flooringInventory.count({ where }),
    client.flooringInventory.findMany({
      where,
      orderBy,
      skip: options.skip,
      take: options.take,
      select: inventoryRowSelect,
    }),
    // Rollup totals over the full filtered scope. `stockQuantity` is the stored,
    // indexed generated column, so the balance total is a cheap SUM that matches
    // the per-row displayed balance exactly.
    client.flooringInventory.aggregate({
      where,
      _sum: { stockQuantity: true, netDeducted: true, startingStock: true },
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeInventoryRow),
    totals: {
      stockBalance: toInventoryFixedString(decimalToNumber(aggregate._sum.stockQuantity)),
      netDeducted: toInventoryFixedString(decimalToNumber(aggregate._sum.netDeducted)),
      startingStock: toInventoryFixedString(decimalToNumber(aggregate._sum.startingStock)),
    },
  }
}

export type InventoryExportOptions = {
  filters?: InventoryListViewOptions["filters"]
  sort?: InventoryListViewSort
  /** Hard row ceiling for this export (the resolved cap). No pagination. */
  take: number
}

/** Export read result — like the list result but without footer rollups (the
 *  CSV file has no footer). */
export type InventoryExportResult = {
  rows: InventoryRecord[]
  total: number
}

/**
 * Unpaginated read for the inventory CSV export. Reuses the list view's
 * `where` + `orderBy` builders verbatim so the exported set is exactly the
 * filtered list (same newest-first order), capped at `take`. Returns `total`
 * too so the route can report "first N of M" when the match count exceeds the
 * cap. The optional `filters.id` scopes to ticked rows.
 */
export async function exportInventoryForListView(
  options: InventoryExportOptions,
  client: InventoryDbClient = db,
): Promise<InventoryExportResult> {
  const where = buildListViewWhere(options)
  const orderBy = buildInventoryListViewOrderBy(options.sort)

  const [total, rows] = await Promise.all([
    client.flooringInventory.count({ where }),
    client.flooringInventory.findMany({
      where,
      orderBy,
      take: options.take,
      select: inventoryRowSelect,
    }),
  ])

  return { total, rows: rows.map(normalizeInventoryRow) }
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

  const { page, hasMore } = sliceHasMore(rows, args.take)
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
 * Distinct import PO# values for the inventory list-view PO# filter chip.
 * Resolved through the `importEntry` relation
 * (`flooring_import_entry.purchaseOrderNumber`) — the inventory snapshot column
 * has been dropped. Global (not warehouse-scoped) and archive-agnostic — every
 * distinct linked PO# is selectable regardless of the Status chip. PO# is
 * nullable on the entry too, so NULL/whitespace-only values are still excluded.
 * Optional ILIKE on the search term. Sorted by the newest linked import entry
 * (`createdAt DESC`, `id` tiebreak); deduped per PO# via `DISTINCT ON`, keeping
 * the most-recently-created entry as each value's representative.
 */
export async function searchInventoryPurchaseOrderNumbers(
  args: InventoryPurchaseOrderSearchArgs,
  client: InventoryDbClient = db,
): Promise<InventoryPurchaseOrderSearchResult> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`ie."purchaseOrderNumber" IS NOT NULL`,
    Prisma.sql`length(trim(ie."purchaseOrderNumber")) > 0`,
  ]
  const trimmed = args.search?.trim() ?? ""
  if (trimmed.length > 0) {
    conditions.push(Prisma.sql`ie."purchaseOrderNumber" ILIKE ${`%${trimmed}%`}`)
  }
  const whereClause = Prisma.join(conditions, " AND ")

  // Fetch take+1 (offset by skip) to detect a next page without a count query.
  // Distinct is wrapped in a subquery so the ORDER BY references the plain
  // alias; the JOIN to the import entry is the source of truth now that the
  // snapshot column is gone.
  const skip = Math.max(0, Math.floor(args.skip ?? 0))
  const rows = await client.$queryRaw<{ purchaseOrderNumber: string }[]>(Prisma.sql`
    SELECT "purchaseOrderNumber"
    FROM (
      SELECT DISTINCT ON (ie."purchaseOrderNumber")
             ie."purchaseOrderNumber" AS "purchaseOrderNumber",
             ie."createdAt"           AS "createdAt",
             ie."id"                  AS "id"
      FROM "flooring_inventory" fi
      JOIN "flooring_import_entry" ie ON fi."importEntryId" = ie."id"
      WHERE ${whereClause}
      ORDER BY ie."purchaseOrderNumber", ie."createdAt" DESC, ie."id"
    ) AS sub
    ORDER BY sub."createdAt" DESC, sub."id"
    LIMIT ${args.take + 1} OFFSET ${skip}
  `)

  const { page, hasMore } = sliceHasMore(rows, args.take)
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
 * Distinct import # values for the inventory list-view Import # filter chip.
 * Resolved through the `importEntry` relation (`flooring_import_entry.importNumber`,
 * an `Int`) — the inventory snapshot column has been dropped. Global (not
 * warehouse-scoped) and archive-agnostic — every distinct linked import number
 * is selectable regardless of the Status chip. Optional ILIKE matches the
 * number's text form. Ordered by the entry's `createdAt DESC` with `id` tiebreak;
 * deduped via `DISTINCT ON`. The picker contract stays `{ value: string }`, so
 * the Int is stringified out.
 */
export async function searchInventoryImportNumbers(
  args: InventoryImportNumberSearchArgs,
  client: InventoryDbClient = db,
): Promise<InventoryImportNumberSearchResult> {
  const conditions: Prisma.Sql[] = []
  const trimmed = args.search?.trim() ?? ""
  if (trimmed.length > 0) {
    conditions.push(Prisma.sql`ie."importNumber"::text ILIKE ${`%${trimmed}%`}`)
  }
  // Optional ILIKE only — when no search term is given there is no filter, so
  // emit no WHERE at all (the inner JOIN already drops rows with no import entry).
  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty

  // Fetch take+1 (offset by skip) to detect a next page without a count query.
  // Distinct is wrapped in a subquery so the ORDER BY references the plain
  // alias; the JOIN to the import entry is the source of truth now that the
  // snapshot column is gone.
  const skip = Math.max(0, Math.floor(args.skip ?? 0))
  const rows = await client.$queryRaw<{ importNumber: number }[]>(Prisma.sql`
    SELECT "importNumber"
    FROM (
      SELECT DISTINCT ON (ie."importNumber")
             ie."importNumber" AS "importNumber",
             ie."createdAt"    AS "createdAt",
             ie."id"           AS "id"
      FROM "flooring_inventory" fi
      JOIN "flooring_import_entry" ie ON fi."importEntryId" = ie."id"
      ${whereClause}
      ORDER BY ie."importNumber", ie."createdAt" DESC, ie."id"
    ) AS sub
    ORDER BY sub."createdAt" DESC, sub."id"
    LIMIT ${args.take + 1} OFFSET ${skip}
  `)

  const { page, hasMore } = sliceHasMore(rows, args.take)
  return { items: page.map((row) => ({ value: String(row.importNumber) })), hasMore }
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
        // Unit now comes from the product's own FK (UoM epic 2B), not the
        // category's stock/send unit.
        unitId: true,
        unit: { select: { name: true, abbreviation: true } },
        // Conversion seed source — copied onto the row on product-select.
        coverageUnitId: true,
        coverageUnit: { select: { name: true, abbreviation: true } },
        coveragePerUnit: true,
        conversionFormulaId: true,
        conversionFormula: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    client.flooringWarehouse.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
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
      unitId: row.unitId,
      unitName: row.unit?.name ?? "",
      unitAbbrev: row.unit?.abbreviation ?? "",
      coverageUnitId: row.coverageUnitId ?? "",
      coverageUnitName: row.coverageUnit?.name ?? "",
      coverageUnitAbbrev: row.coverageUnit?.abbreviation ?? "",
      coveragePerUnit: toDecimalString(row.coveragePerUnit),
      conversionFormulaId: row.conversionFormulaId ?? "",
      conversionFormulaName: row.conversionFormula?.name ?? "",
    })),
    warehouses,
    categories,
  }
}
