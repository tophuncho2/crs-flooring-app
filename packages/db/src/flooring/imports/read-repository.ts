import type { ImportDetail, ImportOption, ImportRow } from "@builders/domain"
import type { Prisma } from "../../generated/prisma/client.js"
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

export function normalizeImportRow(row: ImportRowPayload): ImportRecord {
  return {
    id: row.id,
    importNumber: row.importNumber,
    purchaseOrderNumber: row.purchaseOrderNumber ?? "",
    internalNotes: row.internalNotes ?? "",
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
      { purchaseOrderNumber: { contains: searchQuery, mode: "insensitive" } },
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

export type ImportListGroupField = "warehouse" | "manufacturer"

export type ImportListViewOptions = {
  search?: string
  filters?: { warehouseId?: ReadonlyArray<string> }
  group: { field: ImportListGroupField } | null
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

  const warehouseIds = options.filters?.warehouseId
  if (warehouseIds && warehouseIds.length > 0) {
    clauses.push({ warehouseId: { in: [...warehouseIds] } })
  }

  if (clauses.length === 0) return undefined
  if (clauses.length === 1) return clauses[0]
  return { AND: clauses }
}

function buildListViewOrderBy(
  group: ImportListViewOptions["group"],
): Prisma.FlooringImportEntryOrderByWithRelationInput[] {
  const orderBy: Prisma.FlooringImportEntryOrderByWithRelationInput[] = []

  if (group) {
    if (group.field === "warehouse") {
      orderBy.push({ warehouse: { name: "asc" } })
    } else if (group.field === "manufacturer") {
      orderBy.push({ manufacturer: { companyName: "asc" } })
    }
  }

  // `importNumber` is the autoincrement int — monotonic per insert, so DESC
  // gives newest-first deterministically. `createdAt` would tie on rows
  // created in the same transaction (e.g. batched seed/materialize paths),
  // letting the random uuid `id` tiebreak scramble the visible order.
  orderBy.push({ importNumber: "desc" })
  orderBy.push({ id: "desc" })
  return orderBy
}

export async function listImportsForListView(
  options: ImportListViewOptions,
  client: ImportsDbClient = db,
): Promise<ImportListViewResult> {
  const where = buildListViewWhere(options)
  const orderBy = buildListViewOrderBy(options.group)

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

// --- Picker / options search ---

export type ImportOptionsSearchArgs = {
  /**
   * Required scope — imports belong to a warehouse, and the inventory list
   * gates the Import # / PO # pickers on a picked warehouse. Mirrors the
   * `LocationPicker` contract (locations are warehouse-scoped too).
   */
  warehouseId: string
  search?: string
  take: number
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
): Promise<ImportOption[]> {
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

  const where: Prisma.FlooringImportEntryWhereInput =
    clauses.length === 1 ? clauses[0]! : { AND: clauses }

  const rows = await client.flooringImportEntry.findMany({
    where,
    orderBy: [{ importNumber: "desc" }, { id: "desc" }],
    take: args.take,
    select: {
      id: true,
      importNumber: true,
      purchaseOrderNumber: true,
      warehouse: { select: { name: true } },
      createdAt: true,
    },
  })

  return rows.map((row) => ({
    id: row.id,
    importNumber: String(row.importNumber),
    purchaseOrderNumber: row.purchaseOrderNumber ?? "",
    warehouseName: row.warehouse?.name ?? "",
    createdAt: row.createdAt.toISOString(),
  }))
}

