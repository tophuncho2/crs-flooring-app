import type { Prisma } from "../../../generated/prisma/client.js"
import {
  buildFlooringProductDisplayName,
  type CutLogParentContext,
  type CutLogRow,
  type CutLogStatus,
  type InventoryCutLogRow,
} from "@builders/domain"
import { db } from "../../../client.js"
import {
  cutLogRowSelect,
  inventoryCutLogRowSelect,
  type CutLogDbClient,
  type CutLogRowPayload,
  type InventoryCutLogRowPayload,
} from "./shared.js"

export type CutLogRecord = CutLogRow

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
 * Normalize a cut-log payload into the domain read shape. Decimal columns
 * surface as strings; nullable columns preserve null instead of coercing
 * to "".
 *
 * Two snapshot families on the cut-log row:
 *  - Frozen-at-create: `inventoryItem`, `categorySlug`, `inventoryNumber`,
 *    `rollPrefix`, `rollNumber`, `dyeLot`, `inventoryNote`, and the four
 *    unit-of-measure labels. Stamped once at insert, never mutated.
 *  - Denormalized mirror: `location` — re-stamped on create / update /
 *    finalize, cleared on void.
 *
 * Pre-migration rows surface nulls on the new snapshot columns.
 */
export function normalizeCutLogRow(row: CutLogRowPayload): CutLogRecord {
  const status: CutLogStatus = row.status
  return {
    id: row.id,
    cutLogNumber: row.cutLogNumber,
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
    productName: row.productName,
    warehouseId: row.warehouseId,
    workOrderId: row.workOrderId ?? null,
    workOrderItemId: row.workOrderItemId ?? null,
    before: toDecimalStringOrNull(row.before),
    cut: toDecimalString(row.cut),
    after: toDecimalStringOrNull(row.after),
    coverageCut: toDecimalStringOrNull(row.coverageCut),
    stockUnitName: row.stockUnitName ?? null,
    stockUnitAbbrev: row.stockUnitAbbrev ?? null,
    itemCoverageUnitName: row.itemCoverageUnitName ?? null,
    itemCoverageUnitAbbrev: row.itemCoverageUnitAbbrev ?? null,
    status,
    isFinal: row.isFinal,
    finalCutSequence: row.finalCutSequence,
    isWaste: row.isWaste,
    void: row.void,
    notes: row.notes ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

/**
 * Inventory-side cut-log normalizer. Calls `normalizeCutLogRow` for the
 * canonical fields and stamps the two server-resolved labels needed by
 * the inventory record-view side panel: `workOrderNumber` from the linked
 * work order, `workOrderItemProductLabel` from the linked work-order
 * item's product (via the pure `buildFlooringProductDisplayName` helper,
 * per the data-layer carve-out in `packages/db/CLAUDE.md`).
 */
export function normalizeInventoryCutLogRow(
  row: InventoryCutLogRowPayload,
): InventoryCutLogRow {
  const product = row.workOrderItem?.product ?? null
  return {
    ...normalizeCutLogRow(row),
    workOrderNumber: row.workOrder?.workOrderNumber ?? null,
    workOrderItemProductLabel: product
      ? buildFlooringProductDisplayName({
          name: product.name,
          style: product.style,
          color: product.color,
        })
      : null,
    warehouseName: row.warehouse.name,
  }
}

export async function getCutLogById(
  id: string,
  client: CutLogDbClient = db,
): Promise<CutLogRecord | null> {
  const row = await client.flooringCutLog.findUnique({
    where: { id },
    select: cutLogRowSelect,
  })
  return row ? normalizeCutLogRow(row) : null
}

/**
 * Returns the parent inventory context every cut-log mutation path needs
 * under the FOR UPDATE lock:
 *   - `startingStock` + `currentTotalCutSum` for the
 *     `totalCutSum ≤ startingStock` invariant.
 *   - `coveragePerUnit` + `categorySlug` for `computeCutCoverage`.
 *   - Unit-of-measure labels — stamped on the cut log at create
 *     (frozen thereafter).
 *   - The 5 inventory-identity primitives + the composed `inventoryItem`
 *     — stamped on the cut log at create (frozen thereafter).
 *   - `productId` / `productName` / `warehouseId` — stamped on the cut log
 *     at create (frozen thereafter); `productName` surfaces to the UI as
 *     a label, `productId` / `warehouseId` are FKs used for joins and to
 *     filter the cut-log edit panel's link pickers.
 *   - `location` — re-snapped on every state-changing write; cleared on
 *     void. Carries the parent's current value at call time.
 *
 * Caller has already locked the inventory FOR UPDATE.
 */
export async function getInventoryParentContextForCutLogs(
  tx: Prisma.TransactionClient,
  inventoryId: string,
): Promise<CutLogParentContext | null> {
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
      totalCutSum: true,
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
    currentTotalCutSum: row.totalCutSum.toString(),
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
// WOMI-keyed reads (consumed by the WO record view loader; cut logs are
// the entity, WOMI is the filter dimension — hence colocated with the
// rest of the cut-log read primitives).
// ---------------------------------------------------------------------------

export async function listCutLogsForWorkOrderItem(
  workOrderItemId: string,
  client: CutLogDbClient = db,
): Promise<CutLogRecord[]> {
  const rows = await client.flooringCutLog.findMany({
    where: { workOrderItemId },
    select: cutLogRowSelect,
    orderBy: [
      { isFinal: "asc" },
      { finalCutSequence: "asc" },
      { createdAt: "asc" },
    ],
  })
  return rows.map(normalizeCutLogRow)
}

/**
 * Bulk variant of `listCutLogsForWorkOrderItem` — returns the flat row
 * set across many WOMI ids in one query, ordered identically. The SSR
 * loader for the WO record page calls this once and groups client-side
 * so every expandable cut-log row hydrates from initial data.
 */
export async function listCutLogsForWorkOrderItemIds(
  workOrderItemIds: string[],
  client: CutLogDbClient = db,
): Promise<CutLogRecord[]> {
  if (workOrderItemIds.length === 0) return []
  const rows = await client.flooringCutLog.findMany({
    where: { workOrderItemId: { in: workOrderItemIds } },
    select: cutLogRowSelect,
    orderBy: [
      { isFinal: "asc" },
      { finalCutSequence: "asc" },
      { createdAt: "asc" },
    ],
  })
  return rows.map(normalizeCutLogRow)
}

/**
 * Paginated read of inventory-side cut logs for a single parent record.
 * Powers the cut-log section on the inventory record view.
 *
 * Sort: `finalCutSequence DESC NULLS FIRST`, then `createdAt ASC`. This
 * yields two natural buckets without a CASE expression:
 *
 *   1. Rows with `finalCutSequence = null` (pending — and the rare
 *      VOID-from-PENDING row that was voided before finalize ever ran)
 *      come first, ordered by createdAt ASC.
 *   2. Rows with `finalCutSequence` set (FINAL, plus VOID-after-FINAL —
 *      the sequence is preserved on void) come next, ordered DESC so
 *      the most recently finalized row leads.
 *
 * Returns `{ rows, total }` so the consumer can render Prev/Next
 * controls without a second query.
 */
export async function listInventoryCutLogsPage(
  args: { inventoryId: string; page: number; pageSize: number },
  client: CutLogDbClient = db,
): Promise<{ rows: InventoryCutLogRow[]; total: number }> {
  const where: Prisma.FlooringCutLogWhereInput = { inventoryId: args.inventoryId }
  const skip = (args.page - 1) * args.pageSize

  const [rows, total] = await Promise.all([
    client.flooringCutLog.findMany({
      where,
      select: inventoryCutLogRowSelect,
      orderBy: [
        { finalCutSequence: { sort: "desc", nulls: "first" } },
        { createdAt: "asc" },
        { id: "asc" },
      ],
      skip,
      take: args.pageSize,
    }),
    client.flooringCutLog.count({ where }),
  ])

  return { rows: rows.map(normalizeInventoryCutLogRow), total }
}

/**
 * Minimal-shape read of every cut log on each inventory id, used by
 * `recomputeAndPersistTotalCutSums` to project the post-mutation
 * `totalCutSum`. Returns just the fields `computeTotalCutSum` operates on.
 */
export async function listCutLogsForInventoryIds(
  inventoryIds: string[],
  client: CutLogDbClient = db,
): Promise<Array<{ inventoryId: string; cut: string; void: boolean }>> {
  if (inventoryIds.length === 0) return []
  const rows = await client.flooringCutLog.findMany({
    where: { inventoryId: { in: inventoryIds } },
    select: { inventoryId: true, cut: true, void: true },
  })
  return rows.map((r) => ({
    inventoryId: r.inventoryId,
    cut: r.cut.toString(),
    void: r.void,
  }))
}

export type PendingCutLogWithInventoryForMutation = {
  cutLog: CutLogRecord
  inventory: CutLogParentContext
}

/**
 * Single-query read powering the per-row update + delete sync use cases.
 * Returns the cut log (full normalized record) plus the parent inventory's
 * `CutLogParentContext` shape — the use case asserts WOMI linkage /
 * pending-status / OCC against the cut log, then locks the inventory row
 * FOR UPDATE and applies the patch.
 *
 * Transaction client is required (no `db` default) so the read participates
 * in the same TX that takes the lock.
 */
export async function getPendingCutLogWithInventoryForMutation(
  tx: Prisma.TransactionClient,
  cutLogId: string,
): Promise<PendingCutLogWithInventoryForMutation | null> {
  const row = await tx.flooringCutLog.findUnique({
    where: { id: cutLogId },
    select: {
      ...cutLogRowSelect,
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
          totalCutSum: true,
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
  const { inventory: inv, ...cutLogPayload } = row
  return {
    cutLog: normalizeCutLogRow(cutLogPayload),
    inventory: {
      inventoryId: inv.id,
      inventoryItem: inv.inventoryItem,
      startingStock: inv.startingStock.toString(),
      currentTotalCutSum: inv.totalCutSum.toString(),
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
