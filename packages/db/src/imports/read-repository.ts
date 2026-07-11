import type { ImportDetail, ImportNeighbor, ImportOption, ImportRow } from "@builders/domain"
import type { Prisma } from "../generated/prisma/client.js"
import { db } from "../client.js"
import { resolveNumberNeighbors } from "../shared/number-neighbors.js"
import { exactNumberIntEquals } from "../shared/exact-number-search.js"
import { sliceHasMore } from "../shared/paginate.js"
import { combineAnd } from "../shared/where.js"
import {
  importDetailSelect,
  importRowSelect,
  type ImportDetailPayload,
  type ImportRowPayload,
  type ImportsDbClient,
} from "./shared.js"
import { buildImportsOrderBy } from "./order-by.js"

export type ImportRecord = ImportRow
export type ImportDetailRecord = ImportDetail

export type ImportsListSortEntry = {
  field: string
  direction: Prisma.SortOrder
}

export type ImportsListSort = {
  /** Ordered sort columns, highest priority first. An empty list falls straight
   * through to the importNumber+id tiebreak (the historical default). */
  entries: ImportsListSortEntry[]
}

export function normalizeImportRow(row: ImportRowPayload): ImportRecord {
  return {
    id: row.id,
    importNumber: row.importNumber,
    purchaseOrderNumber: row.purchaseOrderNumber ?? "",
    internalNotes: row.internalNotes ?? "",
    warehouseId: row.warehouseId,
    warehouseName: row.warehouse?.name ?? "",
    // Entity link (Entity Payments epic). entityName is the joined entity.entity
    // display name; "" when the import has no entity linked.
    entityId: row.entityId ?? "",
    entityName: row.entity?.entity ?? "",
    color: row.color,
    stagedInventoryRowsCount: row._count.stagedInventoryRows,
    liveInventoryRowsCount: row._count.inventories,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy ?? "",
    updatedBy: row.updatedBy ?? "",
  }
}

type ImportNeighbors = {
  previousImport: ImportNeighbor | null
  nextImport: ImportNeighbor | null
}

const NO_IMPORT_NEIGHBORS: ImportNeighbors = {
  previousImport: null,
  nextImport: null,
}

export function normalizeImportDetail(
  row: ImportDetailPayload,
  neighbors: ImportNeighbors = NO_IMPORT_NEIGHBORS,
): ImportDetailRecord {
  return {
    ...normalizeImportRow(row),
    stagedInventoryRows: row.stagedInventoryRows.map((entry) => ({ id: entry.id })),
    inventories: row.inventories.map((entry) => ({ id: entry.id })),
    previousImport: neighbors.previousImport,
    nextImport: neighbors.nextImport,
  }
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

/**
 * Resolve the import rows immediately before/after the given number in the
 * global import-number order (`importNumber`). Powers the record-view shell
 * stepper — deliberately global: no warehouse / entity scoping, the
 * stepper walks the raw number line. Two single-row lookups on the unique
 * `importNumber` index. `importNumber` is a non-null autoincrement, so there is
 * always a key to step from; both sides null only at the sequence's edges.
 */
async function getImportNeighbors(
  importNumber: number,
  client: ImportsDbClient = db,
): Promise<ImportNeighbors> {
  const { previous, next } = await resolveNumberNeighbors(
    "importNumber",
    importNumber,
    (q) => client.flooringImportEntry.findFirst({ ...q, select: { id: true } }),
  )

  return {
    previousImport: previous ? { id: previous.id } : null,
    nextImport: next ? { id: next.id } : null,
  }
}

/**
 * Read the full import detail. By default it also resolves the adjacent rows
 * for the record-view shell stepper; pass `{ withNeighbors: false }` on paths
 * that only read a snapshot (e.g. the delete conflict check) to skip the two
 * extra lookups.
 */
export async function getImportDetailById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: ImportsDbClient = db,
): Promise<ImportDetailRecord | null> {
  const row = await client.flooringImportEntry.findUnique({
    where: { id },
    select: importDetailSelect,
  })
  if (!row) return null

  const neighbors =
    options.withNeighbors === false
      ? NO_IMPORT_NEIGHBORS
      : await getImportNeighbors(row.importNumber, client)

  return normalizeImportDetail(row, neighbors)
}

export type ImportListViewOptions = {
  search?: string
  filters?: {
    /**
     * Exact match on `importNumber` (the `@unique` btree int) — the toolbar's
     * IMP-# bar. Non-digits are stripped, so "5" and "IMP-5" both find IMP-5.
     */
    impNumber?: string
    warehouseId?: ReadonlyArray<string>
  }
  /** Ordered multi-column sort; falls through to the importNumber+id tiebreak. */
  sort?: ImportsListSort
  skip: number
  take: number
}

export type ImportListViewResult = {
  rows: ImportRecord[]
  total: number
}

function buildListViewWhere(
  options: Pick<ImportListViewOptions, "search" | "filters">,
): Prisma.FlooringImportEntryWhereInput | undefined {
  const clauses: Prisma.FlooringImportEntryWhereInput[] = []

  // Search targets purchaseOrderNumber (case-insensitive contains). Empty input
  // matches everything.
  if (options.search && options.search.trim() !== "") {
    const trimmed = options.search.trim()
    clauses.push({
      purchaseOrderNumber: { contains: trimmed, mode: "insensitive" },
    })
  }

  // Exact identity search on the int — strip non-digits, parse, match. No
  // digits → -1 sentinel so a junk term returns no rows (never all rows).
  const impNumber = options.filters?.impNumber?.trim() ?? ""
  if (impNumber.length > 0) {
    clauses.push({ importNumber: exactNumberIntEquals(impNumber) })
  }

  const warehouseIds = options.filters?.warehouseId
  if (warehouseIds && warehouseIds.length > 0) {
    clauses.push({ warehouseId: { in: [...warehouseIds] } })
  }

  return combineAnd(clauses)
}

export async function listImportsForListView(
  options: ImportListViewOptions,
  client: ImportsDbClient = db,
): Promise<ImportListViewResult> {
  const where = buildListViewWhere(options)
  const orderBy = buildImportsOrderBy(options.sort)

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

// --- Picker / options search ---

export type ImportOptionsSearchArgs = {
  /**
   * Required scope — imports belong to a warehouse, and the inventory list
   * gates the Import # / PO # pickers on a picked warehouse. Mirrors the
   * `LocationPicker` contract (locations are warehouse-scoped too).
   */
  warehouseId: string
  search?: string
  skip?: number
  take: number
}

export type ImportOptionsSearchResult = {
  items: ImportOption[]
  hasMore: boolean
}

/**
 * Async-dropdown options for the imports pickers (Import # / PO # filter chips
 * on the inventory list view). Scoped to a single warehouse. Search ORs across
 * the two identity columns: `purchaseOrderNumber` is a `String` (ILIKE
 * substring) and `importNumber` is an `Int` (exact match when the query parses
 * as a safe positive integer). Ordered `importNumber DESC` so the newest
 * imports surface first when the user opens the picker without a query —
 * deterministic because the autoincrement int is monotonic per insert (unlike
 * `createdAt`, which ties on rows created in the same transaction).
 */
export async function searchImportOptions(
  args: ImportOptionsSearchArgs,
  client: ImportsDbClient = db,
): Promise<ImportOptionsSearchResult> {
  const trimmed = args.search?.trim() ?? ""

  const clauses: Prisma.FlooringImportEntryWhereInput[] = [
    { warehouseId: args.warehouseId },
  ]
  if (trimmed.length > 0) {
    const orClauses: Prisma.FlooringImportEntryWhereInput[] = [
      { purchaseOrderNumber: { contains: trimmed, mode: "insensitive" } },
    ]
    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed)
      if (Number.isSafeInteger(numeric) && numeric >= 0) {
        orClauses.push({ importNumber: numeric })
      }
    }
    clauses.push({ OR: orClauses })
  }

  const where = combineAnd(clauses)

  // Fetch take+1 to detect a next page without a separate count query.
  const rows = await client.flooringImportEntry.findMany({
    where,
    orderBy: [{ importNumber: "desc" }, { id: "desc" }],
    skip: args.skip ?? 0,
    take: args.take + 1,
    select: {
      id: true,
      importNumber: true,
      purchaseOrderNumber: true,
      warehouse: { select: { name: true } },
      createdAt: true,
    },
  })

  const { page, hasMore } = sliceHasMore(rows, args.take)
  return {
    items: page.map((row) => ({
      id: row.id,
      importNumber: String(row.importNumber),
      purchaseOrderNumber: row.purchaseOrderNumber ?? "",
      warehouseName: row.warehouse?.name ?? "",
      createdAt: row.createdAt.toISOString(),
    })),
    hasMore,
  }
}

