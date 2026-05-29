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
 * Two snapshot families on the adjustment row:
 *  - Frozen-at-create: `inventoryItem`, `categorySlug`, `inventoryNumber`,
 *    `rollPrefix`, `rollNumber`, `dyeLot`, `inventoryNote`, and the four
 *    unit-of-measure labels. Stamped once at insert, never mutated.
 *  - Denormalized mirror: `location` — re-stamped on create / update /
 *    finalize.
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
    // Live product label via the joined product, replacing the frozen
    // `row.productName` snapshot so product edits propagate to every adjustment
    // surface. The snapshot column is still written at create (write path) and
    // is display-dead pending its drop.
    productName: buildFlooringProductDisplayName({
      name: row.product.name,
      style: row.product.style,
      color: row.product.color,
    }),
    warehouseId: row.warehouseId,
    workOrderId: row.workOrderId ?? null,
    workOrderItemId: row.workOrderItemId ?? null,
    before: toDecimalStringOrNull(row.before),
    quantity: toDecimalString(row.quantity),
    after: toDecimalStringOrNull(row.after),
    coverage: toDecimalStringOrNull(row.coverage),
    stockUnitName: row.stockUnitName ?? null,
    stockUnitAbbrev: row.stockUnitAbbrev ?? null,
    itemCoverageUnitName: row.itemCoverageUnitName ?? null,
    itemCoverageUnitAbbrev: row.itemCoverageUnitAbbrev ?? null,
    adjustmentType,
    status,
    isFinal: row.isFinal,
    finalSequence: row.finalSequence,
    isWaste: row.isWaste,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * Inventory-side adjustment normalizer. Calls `normalizeAdjustmentRow` for
 * the canonical fields and stamps the two server-resolved labels needed by
 * the inventory record-view side panel: `workOrderNumber` from the linked
 * work order, `workOrderItemProductLabel` from the linked work-order
 * item's product (via the pure `buildFlooringProductDisplayName` helper,
 * per the data-layer carve-out in `packages/db/CLAUDE.md`).
 */
export function normalizeEnrichedInventoryAdjustmentRow(
  row: EnrichedInventoryAdjustmentRowPayload,
): EnrichedInventoryAdjustmentRow {
  const product = row.workOrderItem?.product ?? null
  return {
    ...normalizeAdjustmentRow(row),
    workOrderNumber: row.workOrder?.workOrderNumber ?? null,
    workOrderItemProductLabel: product
      ? buildFlooringProductDisplayName({
          name: product.name,
          style: product.style,
          color: product.color,
        })
      : null,
    workOrderItemNotes: row.workOrderItem?.notes ?? null,
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
 * Returns the parent inventory context every adjustment mutation path needs
 * under the FOR UPDATE lock:
 *   - `startingStock` + `currentNetDeducted` for the
 *     `netDeducted ≤ startingStock` invariant.
 *   - `coveragePerUnit` + `categorySlug` for `computeAdjustmentCoverage`.
 *   - Unit-of-measure labels — stamped on the adjustment at create
 *     (frozen thereafter).
 *   - The 5 inventory-identity primitives + the composed `inventoryItem`
 *     — stamped on the adjustment at create (frozen thereafter).
 *   - `productId` / `productName` / `warehouseId` — stamped on the adjustment
 *     at create (frozen thereafter); `productName` surfaces to the UI as
 *     a label, `productId` / `warehouseId` are FKs used for joins and to
 *     filter the adjustment edit panel's link pickers.
 *   - `location` — re-snapped on every state-changing write. Carries the
 *     parent's current value at call time.
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
      coveragePerUnit: true,
      categorySlug: true,
      stockUnitName: true,
      stockUnitAbbrev: true,
      itemCoverageUnitName: true,
      itemCoverageUnitAbbrev: true,
      productId: true,
      productName: true,
      warehouseId: true,
    },
  })
  if (!row) return null
  return {
    inventoryId: row.id,
    inventoryItem: row.inventoryItem,
    startingStock: row.startingStock.toString(),
    currentNetDeducted: row.netDeducted.toString(),
    coveragePerUnit:
      row.coveragePerUnit === null ? null : row.coveragePerUnit.toString(),
    categorySlug: row.categorySlug,
    stockUnitName: row.stockUnitName ?? null,
    stockUnitAbbrev: row.stockUnitAbbrev ?? null,
    itemCoverageUnitName: row.itemCoverageUnitName ?? null,
    itemCoverageUnitAbbrev: row.itemCoverageUnitAbbrev ?? null,
    inventoryNumber: row.inventoryNumber,
    rollPrefix: row.rollPrefix,
    rollNumber: row.rollNumber ?? null,
    dyeLot: row.dyeLot ?? null,
    inventoryNote: row.note ?? null,
    location: row.location ?? null,
    productId: row.productId,
    productName: row.productName,
    warehouseId: row.warehouseId,
  }
}

// ---------------------------------------------------------------------------
// WOMI-keyed reads (consumed by the WO record view loader). Only DEDUCTION
// rows can have a WO link, so these queries naturally exclude INCREASE rows;
// the explicit `adjustmentType: "DEDUCTION"` filter is a belt-and-braces
// guarantee that survives any future schema relaxation.
// ---------------------------------------------------------------------------

export async function listAdjustmentsForWorkOrderItem(
  workOrderItemId: string,
  client: InventoryAdjustmentDbClient = db,
): Promise<EnrichedInventoryAdjustmentRow[]> {
  const rows = await client.flooringInventoryAdjustment.findMany({
    where: { workOrderItemId },
    select: enrichedInventoryAdjustmentRowSelect,
    orderBy: [
      { isFinal: "asc" },
      { finalSequence: "asc" },
      { createdAt: "asc" },
    ],
  })
  return rows.map(normalizeEnrichedInventoryAdjustmentRow)
}

/**
 * Bulk variant of `listAdjustmentsForWorkOrderItem` — returns the flat row
 * set across many WOMI ids in one query, ordered identically. The SSR
 * loader for the WO record page calls this once and groups client-side so
 * every expandable adjustment row hydrates from initial data. Rows are
 * enriched (own warehouse name + WO number) so the grid renders the same
 * columns as the ledger; both DEDUCTION and INCREASE WO-linked rows are
 * returned (an INCREASE may now link a work order).
 */
export async function listAdjustmentsForWorkOrderItemIds(
  workOrderItemIds: string[],
  client: InventoryAdjustmentDbClient = db,
): Promise<EnrichedInventoryAdjustmentRow[]> {
  if (workOrderItemIds.length === 0) return []
  const rows = await client.flooringInventoryAdjustment.findMany({
    where: { workOrderItemId: { in: workOrderItemIds } },
    select: enrichedInventoryAdjustmentRowSelect,
    orderBy: [
      { isFinal: "asc" },
      { finalSequence: "asc" },
      { createdAt: "asc" },
    ],
  })
  return rows.map(normalizeEnrichedInventoryAdjustmentRow)
}

/**
 * Paginated read of inventory-side adjustments for a single parent record.
 * Powers the adjustments section on the inventory record view. Returns
 * both DEDUCTION and INCREASE rows interleaved.
 *
 * Sort: `finalSequence DESC NULLS FIRST`, then `id DESC`. This is the
 * single-inventory projection of the shared adjustments order
 * (inventory number → final sequence → id); inv# is constant here because
 * the query is scoped to one `inventoryId`, so it drops out. Two natural
 * buckets fall out without a CASE expression:
 *
 *   1. Rows with `finalSequence = null` (pending) float to the top.
 *   2. Rows with `finalSequence` set (FINAL) come next, ordered DESC so
 *      the most recently finalized row leads.
 *
 * `id DESC` is a deterministic tiebreak only (UUIDs aren't chronological).
 * Backed by the `@@unique([inventoryId, finalSequence])` index.
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
      { finalSequence: { sort: "desc", nulls: "first" } },
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
 *   - `filters.warehouseId` — optional IN match on the snapshot `warehouseId`
 *     (the only toolbar filter).
 *   - `search` — optional case-insensitive substring match on `inventoryItem`
 *     (backed by `flooring_inventory_adjustment_inventoryItem_trgm_idx`).
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
    search?: string
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

  const search = args.search?.trim()
  if (search) {
    where.inventoryItem = { contains: search, mode: "insensitive" }
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
 * `recomputeAndPersistNetDeducted` to project the post-mutation `netDeducted`.
 * Returns just the fields `computeNetDeducted` operates on (signed math
 * keys off the `adjustmentType` discriminator).
 */
export async function listAdjustmentsForInventoryIds(
  inventoryIds: string[],
  client: InventoryAdjustmentDbClient = db,
): Promise<
  Array<{
    inventoryId: string
    quantity: string
    adjustmentType: FlooringInventoryAdjustmentType
  }>
> {
  if (inventoryIds.length === 0) return []
  const rows = await client.flooringInventoryAdjustment.findMany({
    where: { inventoryId: { in: inventoryIds } },
    select: { inventoryId: true, quantity: true, adjustmentType: true },
  })
  return rows.map((r) => ({
    inventoryId: r.inventoryId,
    quantity: r.quantity.toString(),
    adjustmentType: r.adjustmentType,
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
          coveragePerUnit: true,
          categorySlug: true,
          stockUnitName: true,
          stockUnitAbbrev: true,
          itemCoverageUnitName: true,
          itemCoverageUnitAbbrev: true,
          productId: true,
          productName: true,
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
      coveragePerUnit:
        inv.coveragePerUnit === null ? null : inv.coveragePerUnit.toString(),
      categorySlug: inv.categorySlug,
      stockUnitName: inv.stockUnitName ?? null,
      stockUnitAbbrev: inv.stockUnitAbbrev ?? null,
      itemCoverageUnitName: inv.itemCoverageUnitName ?? null,
      itemCoverageUnitAbbrev: inv.itemCoverageUnitAbbrev ?? null,
      inventoryNumber: inv.inventoryNumber,
      rollPrefix: inv.rollPrefix,
      rollNumber: inv.rollNumber ?? null,
      dyeLot: inv.dyeLot ?? null,
      inventoryNote: inv.note ?? null,
      location: inv.location ?? null,
      productId: inv.productId,
      productName: inv.productName,
      warehouseId: inv.warehouseId,
    },
  }
}
