import type { Prisma } from "../../../generated/prisma/client.js"
import {
  buildFlooringProductDisplayName,
  type EnrichedInventoryAdjustmentRow,
  type FlooringInventoryAdjustmentType,
  type InventoryAdjustmentListFilters,
  type InventoryAdjustmentParentContext,
  type InventoryAdjustmentRow,
  type InventoryAdjustmentStatus,
} from "@builders/domain"
import { db } from "../../../client.js"
import {
  adjustmentRowSelect,
  enrichedInventoryAdjustmentRowSelect,
  type EnrichedInventoryAdjustmentRowPayload,
  type InventoryAdjustmentDbClient,
  type InventoryAdjustmentRowPayload,
} from "./shared.js"

export type InventoryAdjustmentRecord = InventoryAdjustmentRow

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
 * Frozen-at-create snapshots on the adjustment row: `inventoryItem`,
 * `categorySlug`, `inventoryNumber`, `rollPrefix`, `rollNumber`, `dyeLot`,
 * `inventoryNote`, and the stock unit-of-measure labels. Stamped once at
 * insert, never mutated. (`location` is separate — user-owned free text,
 * editable through update; not a parent mirror.)
 */
export function normalizeAdjustmentRow(
  row: InventoryAdjustmentRowPayload,
): InventoryAdjustmentRecord {
  const status: InventoryAdjustmentStatus = row.status
  const adjustmentType: FlooringInventoryAdjustmentType = row.adjustmentType
  return {
    id: row.id,
    adjustmentNumber: row.adjustmentNumber,
    inventoryId: row.inventoryId,
    inventoryItem: row.inventoryItem,
    inventoryNumber: row.inventoryNumber ?? null,
    rollPrefix: row.rollPrefix ?? null,
    rollNumber: row.rollNumber ?? null,
    dyeLot: row.dyeLot ?? null,
    inventoryNote: row.inventoryNote ?? null,
    location: row.location ?? null,
    categorySlug: row.categorySlug,
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
    stockUnitName: row.stockUnitName ?? null,
    stockUnitAbbrev: row.stockUnitAbbrev ?? null,
    adjustmentType,
    status,
    isWaste: row.isWaste,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
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
 *   - `categorySlug` — stamped on the adjustment at create.
 *   - Stock unit-of-measure labels — stamped on the adjustment at create
 *     (frozen thereafter).
 *   - The 5 inventory-identity primitives + the composed `inventoryItem`
 *     — stamped on the adjustment at create (frozen thereafter).
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
      inventoryItem: true,
      inventoryNumber: true,
      rollPrefix: true,
      rollNumber: true,
      dyeLot: true,
      note: true,
      location: true,
      startingStock: true,
      netDeducted: true,
      categorySlug: true,
      stockUnitName: true,
      stockUnitAbbrev: true,
      productId: true,
      warehouseId: true,
    },
  })
  if (!row) return null
  return {
    inventoryId: row.id,
    inventoryItem: row.inventoryItem,
    startingStock: row.startingStock.toString(),
    currentNetDeducted: row.netDeducted.toString(),
    categorySlug: row.categorySlug,
    stockUnitName: row.stockUnitName ?? null,
    stockUnitAbbrev: row.stockUnitAbbrev ?? null,
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

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return { rows: page.map(normalizeEnrichedInventoryAdjustmentRow), hasMore }
}

/**
 * Global adjustments ledger read powering the standalone list view. Unlike
 * `listInventoryAdjustmentsPage` this is NOT scoped to one inventory:
 *   - `filters.warehouseId` — optional IN match on the snapshot `warehouseId`.
 *   - `filters.categoryId` — optional IN match via the live `product.categoryId`
 *     relation; `filters.productId` — optional IN match on the `productId`
 *     snapshot. Both mirror the inventory list chips.
 *   - `filters.invNumber`/`rollNumber`/`dyeLot`/`note` — per-field identity
 *     search bars. Each is an independent case-insensitive substring (ILIKE)
 *     match on its own frozen snapshot column (`inventoryNumber`/`rollNumber`/
 *     `dyeLot`/`inventoryNote`), AND'd together. Backed by the per-column
 *     trigram indexes on `flooring_inventory_adjustment`.
 *   - Sort: `createdAt DESC, id DESC` — a stable newest-first ledger order
 *     so freshly created (pending) rows surface at the top rather than
 *     being grouped deep under an inventory item.
 *
 * Reuses `enrichedInventoryAdjustmentRowSelect` + the matching normalizer
 * so the rows carry the same server-resolved labels (workOrderNumber,
 * product label, warehouseName) the inventory hub side panel expects.
 */
export async function listAdjustmentsForListView(
  args: {
    filters: InventoryAdjustmentListFilters
    page: number
    pageSize: number
  },
  client: InventoryAdjustmentDbClient = db,
): Promise<{ rows: EnrichedInventoryAdjustmentRow[]; total: number }> {
  const where: Prisma.FlooringInventoryAdjustmentWhereInput = {}

  const warehouseIds = args.filters.warehouseId
  if (warehouseIds && warehouseIds.length > 0) {
    where.warehouseId = { in: [...warehouseIds] }
  }

  // Category narrows via the live product relation; product is a direct match.
  const categoryIds = args.filters.categoryId
  if (categoryIds && categoryIds.length > 0) {
    where.product = { is: { categoryId: { in: [...categoryIds] } } }
  }

  const productIds = args.filters.productId
  if (productIds && productIds.length > 0) {
    where.productId = { in: [...productIds] }
  }

  // Per-field identity search — one independent ILIKE per filled search bar,
  // each against its own frozen snapshot column (note maps to `inventoryNote`).
  const invNumber = args.filters.invNumber?.trim()
  if (invNumber) {
    where.inventoryNumber = { contains: invNumber, mode: "insensitive" }
  }
  const rollNumber = args.filters.rollNumber?.trim()
  if (rollNumber) {
    where.rollNumber = { contains: rollNumber, mode: "insensitive" }
  }
  const dyeLot = args.filters.dyeLot?.trim()
  if (dyeLot) {
    where.dyeLot = { contains: dyeLot, mode: "insensitive" }
  }
  const note = args.filters.note?.trim()
  if (note) {
    where.inventoryNote = { contains: note, mode: "insensitive" }
  }

  // Import-identity chips target the parent inventory row (the adjustment
  // carries no PO#/import# of its own). Accumulate into one nested relation
  // filter — mirrors the `where.product = { is: {...} }` category pattern above.
  const inventoryWhere: Prisma.FlooringInventoryWhereInput = {}
  const importNumbers = args.filters.importNumber
  if (importNumbers && importNumbers.length > 0) {
    inventoryWhere.importNumber = { in: [...importNumbers] }
  }
  const purchaseOrderNumbers = args.filters.purchaseOrderNumber
  if (purchaseOrderNumbers && purchaseOrderNumbers.length > 0) {
    inventoryWhere.purchaseOrderNumber = { in: [...purchaseOrderNumbers] }
  }
  if (Object.keys(inventoryWhere).length > 0) {
    where.inventory = { is: inventoryWhere }
  }

  const skip = (args.page - 1) * args.pageSize

  const [rows, total] = await Promise.all([
    client.flooringInventoryAdjustment.findMany({
      where,
      select: enrichedInventoryAdjustmentRowSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: args.pageSize,
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

export type PendingAdjustmentWithInventoryForMutation = {
  adjustment: InventoryAdjustmentRecord
  inventory: InventoryAdjustmentParentContext
}

/**
 * Single-query read powering the per-row update + delete sync use cases.
 * Returns the adjustment (full normalized record) plus the parent
 * inventory's `InventoryAdjustmentParentContext` shape — the use case
 * asserts linkage / pending-status / OCC against the adjustment, then locks
 * the inventory row FOR UPDATE and applies the patch.
 *
 * Transaction client is required (no `db` default) so the read participates
 * in the same TX that takes the lock.
 */
export async function getPendingAdjustmentWithInventoryForMutation(
  tx: Prisma.TransactionClient,
  adjustmentId: string,
): Promise<PendingAdjustmentWithInventoryForMutation | null> {
  const row = await tx.flooringInventoryAdjustment.findUnique({
    where: { id: adjustmentId },
    select: {
      ...adjustmentRowSelect,
      inventory: {
        select: {
          id: true,
          inventoryItem: true,
          inventoryNumber: true,
          rollPrefix: true,
          rollNumber: true,
          dyeLot: true,
          note: true,
          location: true,
          startingStock: true,
          netDeducted: true,
          categorySlug: true,
          stockUnitName: true,
          stockUnitAbbrev: true,
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
      inventoryItem: inv.inventoryItem,
      startingStock: inv.startingStock.toString(),
      currentNetDeducted: inv.netDeducted.toString(),
      categorySlug: inv.categorySlug,
      stockUnitName: inv.stockUnitName ?? null,
      stockUnitAbbrev: inv.stockUnitAbbrev ?? null,
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
