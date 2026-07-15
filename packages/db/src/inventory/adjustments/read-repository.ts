import type { Prisma } from "../../generated/prisma/client.js"
import {
  buildFlooringProductDisplayName,
  formatNetAdjustmentQuantity,
  type EnrichedInventoryAdjustmentRow,
  type FlooringInventoryAdjustmentType,
  type InventoryAdjustmentListFilters,
  type InventoryAdjustmentNeighbors,
  type InventoryAdjustmentParentContext,
  type InventoryAdjustmentRow,
} from "@builders/domain"
import { db } from "../../client.js"
import { exactNumberIntEquals } from "../../shared/exact-number-search.js"
import { sliceHasMore } from "../../shared/paginate.js"
import { combineAnd } from "../../shared/where.js"
import { buildProductSearchClauses } from "../../products/product-list-filters.js"
import { resolveConversion } from "../conversion.js"
import { buildAdjustmentsListViewOrderBy } from "./order-by.js"
import {
  adjustmentRowSelect,
  enrichedInventoryAdjustmentRowSelect,
  type EnrichedInventoryAdjustmentRowPayload,
  type InventoryAdjustmentDbClient,
  type InventoryAdjustmentRowPayload,
} from "./shared.js"

export type InventoryAdjustmentRecord = InventoryAdjustmentRow

/** One ordered sort column for the adjustments list view. */
export type AdjustmentsListViewSortEntry = {
  field: string
  direction: "asc" | "desc"
}

/** The resolved multi-column sort passed to `buildAdjustmentsListViewOrderBy`. */
export type AdjustmentsListViewSort = {
  entries: AdjustmentsListViewSortEntry[]
}

function toDecimalString(value: { toString(): string }): string {
  return value.toString()
}

function toDecimalStringOrNull(
  value: { toString(): string } | null | undefined,
): string | null {
  if (value === null || value === undefined) return null
  return value.toString()
}

/**
 * Normalize an adjustment payload into the domain read shape. Decimal
 * columns surface as strings; nullable columns preserve null instead of
 * coercing to "".
 *
 * Frozen-at-create snapshots on the adjustment row: `inventoryNumber`,
 * `rollPrefix`, `rollNumber`, `dyeLot`, `inventoryNote`, and the stock
 * unit-of-measure labels. Stamped once at insert, never mutated. (`location` is
 * separate — user-owned free text, editable through update; not a parent
 * mirror.)
 */
export function normalizeAdjustmentRow(
  row: InventoryAdjustmentRowPayload,
): InventoryAdjustmentRecord {
  const adjustmentType: FlooringInventoryAdjustmentType = row.adjustmentType
  const coveragePerUnit = toDecimalStringOrNull(row.coveragePerUnit)
  // convertedBalance for an adjustment uses its own `quantity` as the basis.
  const conversion = resolveConversion({
    formula: row.conversionFormula,
    rowUnitId: row.unitId,
    coveragePerUnit,
    balance: toDecimalString(row.quantity),
  })
  return {
    id: row.id,
    adjustmentNumber: row.adjustmentNumber,
    inventoryId: row.inventoryId,
    inventoryNumber: row.inventoryNumber ?? null,
    rollPrefix: row.rollPrefix ?? null,
    rollNumber: row.rollNumber ?? null,
    dyeLot: row.dyeLot ?? null,
    inventoryNote: row.inventoryNote ?? null,
    location: row.location ?? null,
    area: row.area ?? null,
    productId: row.productId,
    // Live product label via the joined product. The `productName` snapshot
    // column has been dropped; the label is derived here so product edits
    // propagate to every adjustment surface.
    productName: buildFlooringProductDisplayName({
      name: row.product.name,
      style: row.product.style,
      color: row.product.color,
    }),
    warehouseId: row.warehouseId,
    workOrderId: row.workOrderId ?? null,
    before: toDecimalStringOrNull(row.before),
    quantity: toDecimalString(row.quantity),
    after: toDecimalStringOrNull(row.after),
    cost: toDecimalStringOrNull(row.cost),
    freight: toDecimalStringOrNull(row.freight),
    unitId: row.unitId,
    // Unit display derives solely from the FK join (UoM epic 2B); snapshot
    // columns fully de-referenced (2D drops them).
    unitName: row.unit?.name ?? null,
    unitAbbrev: row.unit?.abbreviation ?? null,
    coverageUnitId: row.coverageUnitId ?? "",
    coverageUnitName: row.coverageUnit?.name ?? "",
    coverageUnitAbbrev: row.coverageUnit?.abbreviation ?? "",
    coveragePerUnit: coveragePerUnit ?? "",
    conversionFormulaId: row.conversionFormulaId ?? "",
    conversionFormulaName: conversion.conversionFormulaName,
    convertedBalance: conversion.convertedBalance,
    conversionUnitName: conversion.conversionUnitName,
    conversionUnitAbbrev: conversion.conversionUnitAbbrev,
    adjustmentType,
    isWaste: row.isWaste,
    internalNotes: row.internalNotes ?? "",
    color: row.color,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    createdBy: row.createdBy ?? null,
    updatedBy: row.updatedBy ?? null,
  }
}

/**
 * Inventory-side adjustment normalizer. Calls `normalizeAdjustmentRow` for the
 * canonical fields and stamps the server-resolved labels the record-view edit
 * face + WO Adjustments grid expect: `workOrderNumber` from the linked work
 * order and the snapshot `warehouseName`.
 */
export function normalizeEnrichedInventoryAdjustmentRow(
  row: EnrichedInventoryAdjustmentRowPayload,
): EnrichedInventoryAdjustmentRow {
  return {
    ...normalizeAdjustmentRow(row),
    workOrderNumber: row.workOrder?.workOrderNumber ?? null,
    warehouseName: row.warehouse.name,
  }
}

export async function getAdjustmentById(
  id: string,
  client: InventoryAdjustmentDbClient = db,
): Promise<InventoryAdjustmentRecord | null> {
  const row = await client.flooringInventoryAdjustment.findUnique({
    where: { id },
    select: adjustmentRowSelect,
  })
  return row ? normalizeAdjustmentRow(row) : null
}

/**
 * Single enriched adjustment read by id. Uses the same enriched select +
 * normalizer as `listInventoryAdjustmentsPage`, so the row carries the
 * server-resolved labels (workOrderNumber, work-order-item product label,
 * warehouseName) the record-view edit face expects. Powers deep-linking into a
 * specific adjustment (the adjustments ledger row → inventory record view) when
 * the row isn't on the first loaded page.
 */
export async function getEnrichedInventoryAdjustmentById(
  id: string,
  client: InventoryAdjustmentDbClient = db,
): Promise<EnrichedInventoryAdjustmentRow | null> {
  const row = await client.flooringInventoryAdjustment.findUnique({
    where: { id },
    select: enrichedInventoryAdjustmentRowSelect,
  })
  return row ? normalizeEnrichedInventoryAdjustmentRow(row) : null
}

/**
 * Returns the parent inventory context every adjustment mutation path needs
 * under the FOR UPDATE lock:
 *   - `startingStock` + `currentNetDeducted` for the
 *     `netDeducted ≤ startingStock` invariant.
 *   - Stock unit-of-measure labels — stamped on the adjustment at create
 *     (frozen thereafter).
 *   - The 5 inventory-identity primitives — stamped on the adjustment at
 *     create (frozen thereafter).
 *   - `productId` / `warehouseId` — stamped on the adjustment at create
 *     (frozen thereafter); FKs used for joins and to filter the adjustment
 *     edit panel's link pickers. The product label is derived from the
 *     `product` join at read time, not stored.
 *   - `location` — the parent inventory's own location. No longer mirrored
 *     onto adjustments (their `location` is user-owned); retained here for
 *     any caller that wants the parent's value.
 *
 * Caller has already locked the inventory FOR UPDATE.
 */
export async function getInventoryParentContextForAdjustments(
  tx: Prisma.TransactionClient,
  inventoryId: string,
): Promise<InventoryAdjustmentParentContext | null> {
  const row = await tx.flooringInventory.findUnique({
    where: { id: inventoryId },
    select: {
      id: true,
      inventoryNumber: true,
      rollPrefix: true,
      rollNumber: true,
      dyeLot: true,
      note: true,
      location: true,
      startingStock: true,
      cost: true,
      freight: true,
      netDeducted: true,
      unitId: true,
      // Unit display for mutation error messages derives from the FK join (UoM
      // epic 2B); snapshot columns fully de-referenced (2D drops them).
      unit: { select: { name: true, abbreviation: true } },
      // Conversion trio — stamped onto the child adjustment at create.
      coverageUnitId: true,
      coveragePerUnit: true,
      conversionFormulaId: true,
      productId: true,
      warehouseId: true,
    },
  })
  if (!row) return null
  return {
    inventoryId: row.id,
    startingStock: row.startingStock.toString(),
    cost: toDecimalStringOrNull(row.cost),
    freight: toDecimalStringOrNull(row.freight),
    currentNetDeducted: row.netDeducted.toString(),
    unitId: row.unitId,
    unitName: row.unit?.name ?? null,
    unitAbbrev: row.unit?.abbreviation ?? null,
    coverageUnitId: row.coverageUnitId ?? null,
    coveragePerUnit: toDecimalStringOrNull(row.coveragePerUnit),
    conversionFormulaId: row.conversionFormulaId ?? null,
    inventoryNumber: row.inventoryNumber,
    rollPrefix: row.rollPrefix,
    rollNumber: row.rollNumber ?? null,
    dyeLot: row.dyeLot ?? null,
    inventoryNote: row.note ?? null,
    location: row.location ?? null,
    productId: row.productId,
    warehouseId: row.warehouseId,
  }
}

// ---------------------------------------------------------------------------
// Work-order-keyed read (consumed by the WO record view loader). Adjustments
// link to a work order (any product), never to a material item, so the WO
// Adjustments grid reads every adjustment on the WO and groups by the
// adjustment's own product snapshot. Both DEDUCTION and INCREASE rows are
// returned (an INCREASE may carry a WO link).
// ---------------------------------------------------------------------------

/**
 * Every adjustment linked to a work order, enriched (own warehouse name + WO
 * number). Ordered `productName ASC, quantity ASC, id ASC` so the consumer can
 * group by product into contiguous runs with a stable in-group order. The
 * product label is derived from the live join, so the ORDER BY keys off
 * `product.name` (the closest stable proxy; the consumer re-groups on the
 * normalized `productId`/`productName`).
 */
export async function listAdjustmentsForWorkOrder(
  workOrderId: string,
  client: InventoryAdjustmentDbClient = db,
): Promise<EnrichedInventoryAdjustmentRow[]> {
  const rows = await client.flooringInventoryAdjustment.findMany({
    where: { workOrderId },
    select: enrichedInventoryAdjustmentRowSelect,
    orderBy: [
      { product: { name: "asc" } },
      { quantity: "asc" },
      { id: "asc" },
    ],
  })
  return rows.map(normalizeEnrichedInventoryAdjustmentRow)
}

/**
 * Paginated read of inventory-side adjustments for a single parent record.
 * Powers the adjustments section on the inventory record view. Returns
 * both DEDUCTION and INCREASE rows interleaved.
 *
 * Sort: `createdAt DESC`, then `id DESC` (deterministic tiebreak for
 * same-instant inserts). The ledger is purely chronological now — the newest
 * adjustment leads, and its `after` is the current on-hand. `before`/`after`
 * are maintained by `recomputeAndPersistNetDeducted`, which replays the chain
 * in the inverse (`createdAt` ASC) order on every mutation.
 */
export async function listInventoryAdjustmentsPage(
  args: { inventoryId: string; skip: number; take: number },
  client: InventoryAdjustmentDbClient = db,
): Promise<{ rows: EnrichedInventoryAdjustmentRow[]; hasMore: boolean }> {
  const where: Prisma.FlooringInventoryAdjustmentWhereInput = {
    inventoryId: args.inventoryId,
  }

  // Fetch take+1 to detect a next page without a separate count query.
  const rows = await client.flooringInventoryAdjustment.findMany({
    where,
    select: enrichedInventoryAdjustmentRowSelect,
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    skip: args.skip,
    take: args.take + 1,
  })

  const { page, hasMore } = sliceHasMore(rows, args.take)
  return { rows: page.map(normalizeEnrichedInventoryAdjustmentRow), hasMore }
}

export type InventoryAdjustmentNeighborsResult = InventoryAdjustmentNeighbors & {
  /** The cursor row's parent — lets the use case assert the requested scope. */
  inventoryId: string
}

/**
 * Prev/next neighbors of one adjustment within its parent inventory's ledger,
 * powering the record-view Adjustments-section stepper. Stepping follows the
 * numeric `+1 = next` convention shared by the inventory shell stepper and the
 * reference-header pickers (RIGHT advances to the newer/higher adjustment), NOT
 * the newest-first visual list order (`createdAt DESC` — see
 * `listInventoryAdjustmentsPage`). Neighbors are a keyset step scoped to
 * `inventoryId`.
 *
 *   - previous (◀): older — the largest `(createdAt, id)` strictly less than the
 *     cursor.
 *   - next (▶): newer — the smallest `(createdAt, id)` strictly greater than the
 *     cursor.
 *
 * The `(createdAt, id)` tuple compare is OR-decomposed (Prisma has no row-value
 * comparator). Returns `null` when the adjustment id does not exist.
 */
export async function getAdjustmentNeighbors(
  adjustmentId: string,
  client: InventoryAdjustmentDbClient = db,
): Promise<InventoryAdjustmentNeighborsResult | null> {
  const cursor = await client.flooringInventoryAdjustment.findUnique({
    where: { id: adjustmentId },
    select: { id: true, inventoryId: true, createdAt: true },
  })
  if (!cursor) return null

  const neighborSelect = { id: true, adjustmentNumber: true } as const
  const [previous, next] = await Promise.all([
    // ◀ older: largest (createdAt, id) strictly less than the cursor.
    client.flooringInventoryAdjustment.findFirst({
      where: {
        inventoryId: cursor.inventoryId,
        OR: [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ],
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: neighborSelect,
    }),
    // ▶ newer: smallest (createdAt, id) strictly greater than the cursor.
    client.flooringInventoryAdjustment.findFirst({
      where: {
        inventoryId: cursor.inventoryId,
        OR: [
          { createdAt: { gt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { gt: cursor.id } },
        ],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: neighborSelect,
    }),
  ])

  return {
    inventoryId: cursor.inventoryId,
    previousAdjustment: previous,
    nextAdjustment: next,
  }
}

/**
 * Global adjustments ledger read powering the standalone list view. Unlike
 * `listInventoryAdjustmentsPage` this is NOT scoped to one inventory:
 *   - `filters.warehouseId` — optional IN match on the snapshot `warehouseId`.
 *   - `filters.categoryId` — optional IN match via the live `product.categoryId`
 *     relation; `filters.productId` — optional IN match on the `productId`
 *     snapshot. Both mirror the inventory list chips.
 *   - `filters.adjNumber`/`invNumber` — exact numeric matches on the generated
 *     `adjustmentNumberInt`/`inventoryNumberInt` btree columns (digits stripped
 *     from the query); "12" finds ADJ-12/INV-12 only.
 *   - `filters.rollNumber`/`dyeLot`/`note` — case-insensitive substring (ILIKE)
 *     matches on their own frozen snapshot columns (`rollNumber`/`dyeLot`/
 *     `inventoryNote`), backed by the per-column trigram indexes. All search
 *     filters AND together.
 *   - Sort: `createdAt DESC, id DESC` — a stable newest-first ledger order
 *     so freshly created rows surface at the top rather than
 *     being grouped deep under an inventory item.
 *
 * Reuses `enrichedInventoryAdjustmentRowSelect` + the matching normalizer
 * so the rows carry the same server-resolved labels (workOrderNumber,
 * product label, warehouseName) the inventory hub side panel expects.
 */
/**
 * Pure `where` builder for the standalone adjustments ledger list view, shared by
 * the paginated list read and the CSV export read so both scope identically.
 *   - `id` — the export "selected rows" path: an explicit IN over ticked ids,
 *     ANDed with the other filters (mirrors inventory's `buildListViewWhere`). A
 *     ticked row that has since been filtered out is silently excluded.
 *   - warehouse/category/product — IN matches (category via the live product
 *     relation; product a direct `productId` match).
 *   - adj#/inv# — EXACT numeric matches on the generated integer columns
 *     (`adjustmentNumberInt`/`inventoryNumberInt`, btree): "12" finds INV-12
 *     only, never INV-120/INV-312. The user may type bare ("12") or prefixed
 *     ("INV-12"/"ADJ-12"); non-digits are stripped, and a non-numeric query
 *     matches nothing via the -1 sentinel (both sequences are always positive).
 *   - roll#/dye/note — substring ILIKE against their own frozen snapshot column
 *     (note maps to `inventoryNote`). All filters AND together.
 */
function buildAdjustmentsListViewWhere(
  filters: InventoryAdjustmentListFilters,
): Prisma.FlooringInventoryAdjustmentWhereInput {
  const where: Prisma.FlooringInventoryAdjustmentWhereInput = {}

  const ids = filters.id
  if (ids && ids.length > 0) {
    where.id = { in: [...ids] }
  }

  const warehouseIds = filters.warehouseId
  if (warehouseIds && warehouseIds.length > 0) {
    where.warehouseId = { in: [...warehouseIds] }
  }

  // Category and the four shared product-attribute searches (PROD-#/color/style/
  // naming addon) all narrow via the live `product` relation, so they combine
  // into ONE `product.is` clause (Prisma allows only one relation key). Product
  // is a direct `productId` match, separate from the relation filter.
  const productClauses: Prisma.FlooringProductWhereInput[] = []
  const categoryIds = filters.categoryId
  if (categoryIds && categoryIds.length > 0) {
    productClauses.push({ categoryId: { in: [...categoryIds] } })
  }
  productClauses.push(...buildProductSearchClauses(filters))
  const productWhere = combineAnd(productClauses)
  if (productWhere) {
    where.product = { is: productWhere }
  }

  const productIds = filters.productId
  if (productIds && productIds.length > 0) {
    where.productId = { in: [...productIds] }
  }

  const adjNumber = filters.adjNumber?.trim()
  if (adjNumber) {
    where.adjustmentNumberInt = exactNumberIntEquals(adjNumber)
  }
  const invNumber = filters.invNumber?.trim()
  if (invNumber) {
    where.inventoryNumberInt = exactNumberIntEquals(invNumber)
  }
  const rollNumber = filters.rollNumber?.trim()
  if (rollNumber) {
    where.rollNumber = { contains: rollNumber, mode: "insensitive" }
  }
  const dyeLot = filters.dyeLot?.trim()
  if (dyeLot) {
    where.dyeLot = { contains: dyeLot, mode: "insensitive" }
  }
  const note = filters.note?.trim()
  if (note) {
    where.inventoryNote = { contains: note, mode: "insensitive" }
  }

  return where
}

export async function listAdjustmentsForListView(
  args: {
    filters: InventoryAdjustmentListFilters
    page: number
    pageSize: number
    sort?: AdjustmentsListViewSort
  },
  client: InventoryAdjustmentDbClient = db,
): Promise<{
  rows: EnrichedInventoryAdjustmentRow[]
  total: number
  totals: { quantityNet: string }
}> {
  const where = buildAdjustmentsListViewWhere(args.filters)
  const skip = (args.page - 1) * args.pageSize

  const [rows, total, grouped] = await Promise.all([
    client.flooringInventoryAdjustment.findMany({
      where,
      select: enrichedInventoryAdjustmentRowSelect,
      orderBy: buildAdjustmentsListViewOrderBy(args.sort),
      skip,
      take: args.pageSize,
    }),
    client.flooringInventoryAdjustment.count({ where }),
    // Net quantity total over the filtered set: sum `quantity` per direction so
    // INCREASE adds and DEDUCTION subtracts (the column stores magnitudes; the
    // sign lives in `adjustmentType`).
    client.flooringInventoryAdjustment.groupBy({
      by: ["adjustmentType"],
      where,
      _sum: { quantity: true },
    }),
  ])

  let net = 0
  for (const group of grouped) {
    const sum = group._sum.quantity ? group._sum.quantity.toNumber() : 0
    net += group.adjustmentType === "INCREASE" ? sum : -sum
  }

  return {
    rows: rows.map(normalizeEnrichedInventoryAdjustmentRow),
    total,
    totals: { quantityNet: formatNetAdjustmentQuantity(net) },
  }
}

export type AdjustmentsExportOptions = {
  filters: InventoryAdjustmentListFilters
  sort?: AdjustmentsListViewSort
  /** Hard row ceiling for this export (the resolved cap). No pagination. */
  take: number
}

/**
 * Unpaginated read for the adjustments CSV export. Reuses the list view's
 * `where` + `orderBy` builders verbatim so the exported set is exactly the
 * filtered ledger (same newest-first order), capped at `take`. Returns `total`
 * too so the route can report "first N of M" when the match count exceeds the
 * cap. The optional `filters.id` scopes to ticked rows.
 */
export async function exportAdjustmentsForListView(
  options: AdjustmentsExportOptions,
  client: InventoryAdjustmentDbClient = db,
): Promise<{ rows: EnrichedInventoryAdjustmentRow[]; total: number }> {
  const where = buildAdjustmentsListViewWhere(options.filters)

  const [rows, total] = await Promise.all([
    client.flooringInventoryAdjustment.findMany({
      where,
      select: enrichedInventoryAdjustmentRowSelect,
      orderBy: buildAdjustmentsListViewOrderBy(options.sort),
      take: options.take,
    }),
    client.flooringInventoryAdjustment.count({ where }),
  ])

  return { rows: rows.map(normalizeEnrichedInventoryAdjustmentRow), total }
}

/**
 * Minimal-shape read of every adjustment on each inventory id, used by
 * `recomputeAndPersistNetDeducted` to project the post-mutation `netDeducted`
 * AND to replay the per-row `before`/`after` ledger. Returns `id` + `createdAt`
 * (the chain order) alongside the signed-math fields (`quantity`,
 * `adjustmentType`).
 */
export async function listAdjustmentsForInventoryIds(
  inventoryIds: string[],
  client: InventoryAdjustmentDbClient = db,
): Promise<
  Array<{
    id: string
    inventoryId: string
    quantity: string
    adjustmentType: FlooringInventoryAdjustmentType
    createdAt: Date
  }>
> {
  if (inventoryIds.length === 0) return []
  const rows = await client.flooringInventoryAdjustment.findMany({
    where: { inventoryId: { in: inventoryIds } },
    select: {
      id: true,
      inventoryId: true,
      quantity: true,
      adjustmentType: true,
      createdAt: true,
    },
  })
  return rows.map((r) => ({
    id: r.id,
    inventoryId: r.inventoryId,
    quantity: r.quantity.toString(),
    adjustmentType: r.adjustmentType,
    createdAt: r.createdAt,
  }))
}

export type AdjustmentWithInventoryForMutation = {
  adjustment: InventoryAdjustmentRecord
  inventory: InventoryAdjustmentParentContext
}

/**
 * Single-query read powering the per-row update + delete sync use cases.
 * Returns the adjustment (full normalized record) plus the parent
 * inventory's `InventoryAdjustmentParentContext` shape — the use case
 * asserts linkage / OCC against the adjustment, then locks
 * the inventory row FOR UPDATE and applies the patch.
 *
 * Transaction client is required (no `db` default) so the read participates
 * in the same TX that takes the lock.
 */
export async function getAdjustmentWithInventoryForMutation(
  tx: Prisma.TransactionClient,
  adjustmentId: string,
): Promise<AdjustmentWithInventoryForMutation | null> {
  const row = await tx.flooringInventoryAdjustment.findUnique({
    where: { id: adjustmentId },
    select: {
      ...adjustmentRowSelect,
      inventory: {
        select: {
          id: true,
          inventoryNumber: true,
          rollPrefix: true,
          rollNumber: true,
          dyeLot: true,
          note: true,
          location: true,
          startingStock: true,
          cost: true,
          freight: true,
          netDeducted: true,
          unitId: true,
          // Unit display derives from the FK join (UoM epic 2B); snapshot
          // columns fully de-referenced (2D drops them).
          unit: { select: { name: true, abbreviation: true } },
          // Conversion trio — stamped onto the child adjustment at create.
          coverageUnitId: true,
          coveragePerUnit: true,
          conversionFormulaId: true,
          productId: true,
          warehouseId: true,
        },
      },
    },
  })
  if (!row) return null
  const { inventory: inv, ...adjustmentPayload } = row
  return {
    adjustment: normalizeAdjustmentRow(adjustmentPayload),
    inventory: {
      inventoryId: inv.id,
      startingStock: inv.startingStock.toString(),
      cost: toDecimalStringOrNull(inv.cost),
      freight: toDecimalStringOrNull(inv.freight),
      currentNetDeducted: inv.netDeducted.toString(),
      unitId: inv.unitId,
      unitName: inv.unit?.name ?? null,
      unitAbbrev: inv.unit?.abbreviation ?? null,
      coverageUnitId: inv.coverageUnitId ?? null,
      coveragePerUnit: toDecimalStringOrNull(inv.coveragePerUnit),
      conversionFormulaId: inv.conversionFormulaId ?? null,
      inventoryNumber: inv.inventoryNumber,
      rollPrefix: inv.rollPrefix,
      rollNumber: inv.rollNumber ?? null,
      dyeLot: inv.dyeLot ?? null,
      inventoryNote: inv.note ?? null,
      location: inv.location ?? null,
      productId: inv.productId,
      warehouseId: inv.warehouseId,
    },
  }
}
