import type { Prisma } from "../../../generated/prisma/client.js"
import {
  computeLedgerBeforeAfter,
  computeNetDeducted,
  type FlooringInventoryAdjustmentType,
  type PendingAdjustmentInventorySnapshot,
} from "@builders/domain"
import {
  listAdjustmentsForInventoryIds,
  normalizeAdjustmentRow,
  type InventoryAdjustmentRecord,
} from "./read-repository.js"
import { adjustmentRowSelect } from "./shared.js"

// Every mutating primitive in this file requires a caller-managed
// transaction (`tx: Prisma.TransactionClient` as the first argument). The
// application use case opens the transaction, locks the parent inventory
// row `FOR UPDATE` via `lockInventoryForAdjustment` (see `./locks.ts`),
// validates domain invariants, applies the adjustment mutation via these
// primitives, and adjusts `inventory.netDeducted` in the same transaction
// via `recomputeAndPersistNetDeducted`.

// ---------------------------------------------------------------------------
// Synchronous per-row pending-adjustment primitives (used by both WO-side and
// inv-side application use cases — adjustments are the entity; the calling
// scope just differs by which identity columns it supplies).
// ---------------------------------------------------------------------------

/**
 * Snapshot of the parent inventory's unit-of-measure labels at create
 * time. Stamped onto the adjustment on insert and never re-snapped — the
 * adjustment keeps its frozen labels even if the parent inventory's UoM is
 * later edited.
 */
export type PendingAdjustmentUnitSnapshot = {
  stockUnitName: string | null
  stockUnitAbbrev: string | null
}

export type InsertPendingAdjustmentRowInput = {
  /** Direction of the adjustment. INCREASE may never carry a WO link. */
  adjustmentType: FlooringInventoryAdjustmentType
  /** Always positive in storage; direction lives in `adjustmentType`. */
  quantity: string
  /** Required null on INCREASE rows. */
  workOrderId: string | null
  /** Required null on INCREASE rows. */
  workOrderItemId: string | null
  inventoryId: string
  /** Required false on INCREASE rows. */
  isWaste: boolean
  /** Empty string accepted; persisted as null when blank. */
  notes: string
  unitSnapshot: PendingAdjustmentUnitSnapshot
  /**
   * Identity snapshot from the parent inventory: the composed
   * `inventoryItem` string + `categorySlug` + the 5 underlying primitives
   * (`inventoryNumber`, `rollPrefix`, `rollNumber`, `dyeLot`,
   * `inventoryNote`). Stamped at insert and frozen — never re-stamped.
   */
  inventorySnapshot: PendingAdjustmentInventorySnapshot
  /**
   * User-owned free-text location. Not seeded from the parent inventory and
   * never re-snapped by update-pending.
   */
  location: string | null
}

/**
 * Single-row insert for the synchronous create flow. Caller has locked the
 * parent inventory FOR UPDATE and read the inventory's unit fields +
 * identity fields. This primitive is a pure
 * persistence call — no business rules, no invariant checks (those run in
 * the use case before/after via the domain).
 *
 * Stamps the two stock unit-snapshot fields, the nine identity-snapshot fields
 * (`inventoryItem`, `categorySlug`, the 5 identity primitives, plus
 * `productId` / `warehouseId`), and the user-owned `location` from the input.
 *
 * `before` / `after` are left null here; the caller immediately runs
 * `recomputeAndPersistNetDeducted`, which replays the inventory's whole chain
 * in `createdAt` order and stamps `before`/`after` on every row (including this
 * one). The vestigial `finalSequence` / `isFinal` / `status` columns stay at
 * their schema defaults (null / false / PENDING) — they're no longer read.
 * `adjustmentNumber` is DB-generated via the sequence default.
 */
export async function insertPendingAdjustmentRow(
  tx: Prisma.TransactionClient,
  input: InsertPendingAdjustmentRowInput,
): Promise<InventoryAdjustmentRecord> {
  const inserted = await tx.flooringInventoryAdjustment.create({
    data: {
      inventoryId: input.inventoryId,
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
      adjustmentType: input.adjustmentType,
      quantity: input.quantity,
      isWaste: input.isWaste,
      notes: input.notes ? input.notes : null,
      stockUnitName: input.unitSnapshot.stockUnitName,
      stockUnitAbbrev: input.unitSnapshot.stockUnitAbbrev,
      inventoryItem: input.inventorySnapshot.inventoryItem,
      categorySlug: input.inventorySnapshot.categorySlug,
      inventoryNumber: input.inventorySnapshot.inventoryNumber,
      rollPrefix: input.inventorySnapshot.rollPrefix,
      rollNumber: input.inventorySnapshot.rollNumber,
      dyeLot: input.inventorySnapshot.dyeLot,
      inventoryNote: input.inventorySnapshot.inventoryNote,
      productId: input.inventorySnapshot.productId,
      warehouseId: input.inventorySnapshot.warehouseId,
      location: input.location,
    },
    select: adjustmentRowSelect,
  })
  return normalizeAdjustmentRow(inserted)
}

export type UpdatePendingAdjustmentRowPatch = {
  /** Always positive (validator enforces); direction is immutable post-create. */
  quantity?: string
  isWaste?: boolean
  /** Empty string accepted; persisted as null when blank. */
  notes?: string
  /**
   * User-owned free-text location. Written only when the patch carries it
   * (`null` clears it); never re-snapped from the parent inventory.
   */
  location?: string | null
  /**
   * WO/WOMI link edits. Both move together per `assertAdjustmentLinkageRules`
   * (enforced by the use case before calling here). `null` disconnects the
   * relation; a string id connects. Absent fields leave the relation
   * untouched. Forbidden entirely on INCREASE rows.
   */
  workOrderId?: string | null
  workOrderItemId?: string | null
}

export type UpdatePendingAdjustmentRowInput = {
  id: string
  patch: UpdatePendingAdjustmentRowPatch
}

/**
 * Single-row update for the synchronous update flow. Caller has read the
 * row + parent inventory, asserted PENDING status + OCC + linkage rules,
 * and locked the parent inventory FOR UPDATE.
 *
 * Writable in this primitive:
 *   - user-editable form fields: `quantity`, `isWaste`, `notes`, `location`
 *   - link relations `workOrderId` / `workOrderItemId` (both-or-neither
 *     for DEDUCTION; forbidden on INCREASE — enforced upstream)
 *
 * Never written here: `inventoryId`, `adjustmentType`, `status`, `isFinal`,
 * `before`, `after`, `finalSequence`, `adjustmentNumber`, `createdAt`,
 * `inventoryItem`, the 5 inventory-identity snapshot primitives, and the
 * stock unit-snapshot fields. Empty-patch calls return the row as-is.
 */
export async function updatePendingAdjustmentRow(
  tx: Prisma.TransactionClient,
  input: UpdatePendingAdjustmentRowInput,
): Promise<InventoryAdjustmentRecord> {
  const data: Prisma.FlooringInventoryAdjustmentUpdateInput = {}
  if (input.patch.quantity !== undefined) data.quantity = input.patch.quantity
  if (input.patch.isWaste !== undefined) data.isWaste = input.patch.isWaste
  if (input.patch.notes !== undefined) {
    data.notes = input.patch.notes ? input.patch.notes : null
  }
  if (input.patch.location !== undefined) data.location = input.patch.location
  if (input.patch.workOrderId !== undefined) {
    data.workOrder =
      input.patch.workOrderId === null
        ? { disconnect: true }
        : { connect: { id: input.patch.workOrderId } }
  }
  if (input.patch.workOrderItemId !== undefined) {
    data.workOrderItem =
      input.patch.workOrderItemId === null
        ? { disconnect: true }
        : { connect: { id: input.patch.workOrderItemId } }
  }
  const updated =
    Object.keys(data).length > 0
      ? await tx.flooringInventoryAdjustment.update({
          where: { id: input.id },
          data,
          select: adjustmentRowSelect,
        })
      : await tx.flooringInventoryAdjustment.findUniqueOrThrow({
          where: { id: input.id },
          select: adjustmentRowSelect,
        })
  return normalizeAdjustmentRow(updated)
}

export type DeletePendingAdjustmentRowInput = {
  id: string
}

/**
 * Single-row delete for the synchronous delete flow. Caller has read the
 * row, asserted PENDING status (so finals can't be deleted) + OCC, and
 * locked the parent inventory FOR UPDATE. Pure persistence call.
 */
export async function deletePendingAdjustmentRow(
  tx: Prisma.TransactionClient,
  input: DeletePendingAdjustmentRowInput,
): Promise<void> {
  await tx.flooringInventoryAdjustment.delete({ where: { id: input.id } })
}

type LedgerAdjustmentRow = {
  id: string
  inventoryId: string
  quantity: string
  adjustmentType: FlooringInventoryAdjustmentType
  createdAt: Date
}

/** Ledger order: `createdAt` ASC, `id` ASC tiebreak (matches the read-side display order inverted). */
function compareLedgerOrder(a: LedgerAdjustmentRow, b: LedgerAdjustmentRow): number {
  const byTime = a.createdAt.getTime() - b.createdAt.getTime()
  if (byTime !== 0) return byTime
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/**
 * For each inventory id, reconciles BOTH derived projections of its adjustment
 * ledger in one pass:
 *
 *   1. `inventory.netDeducted` — Σ signedDelta(row) (order-independent;
 *      DEDUCTIONs positive, INCREASEs negative), via `computeNetDeducted`.
 *   2. Every adjustment's `before`/`after` — the running balance, replayed in
 *      `createdAt` order from `startingStock` via `computeLedgerBeforeAfter`.
 *
 * Called by every adjustment mutation (create/update/delete) so editing any
 * row re-flows the whole chain below it. The application layer asserts the
 * `netDeducted ≤ startingStock` ceiling separately via
 * `assertNetDeductedWithinStartingStock`.
 *
 * Co-located with the adjustment write primitives because every caller is
 * "wrote an adjustment → now reconcile the parent inventory" — the functional
 * cohesion keeps callers from hopping between modules.
 */
export async function recomputeAndPersistNetDeducted(
  tx: Prisma.TransactionClient,
  inventoryIds: string[],
): Promise<Array<{ inventoryId: string; netDeducted: string }>> {
  if (inventoryIds.length === 0) return []

  const [rows, inventories] = await Promise.all([
    listAdjustmentsForInventoryIds(inventoryIds, tx),
    tx.flooringInventory.findMany({
      where: { id: { in: inventoryIds } },
      select: { id: true, startingStock: true },
    }),
  ])

  const startingStockById = new Map<string, string>()
  for (const inv of inventories) {
    startingStockById.set(inv.id, inv.startingStock.toString())
  }

  const grouped = new Map<string, LedgerAdjustmentRow[]>()
  for (const id of inventoryIds) {
    grouped.set(id, [])
  }
  for (const row of rows) {
    grouped.get(row.inventoryId)?.push(row)
  }

  const results: Array<{ inventoryId: string; netDeducted: string }> = []
  for (const [inventoryId, group] of grouped) {
    // 1. netDeducted (order-independent sum).
    const netDeducted = computeNetDeducted(
      group.map((r) => ({ quantity: r.quantity, adjustmentType: r.adjustmentType })),
    )
    await tx.flooringInventory.update({
      where: { id: inventoryId },
      data: { netDeducted },
      select: { id: true },
    })

    // 2. Per-row before/after — replay the chain in createdAt order.
    const ledger = computeLedgerBeforeAfter(
      [...group].sort(compareLedgerOrder).map((r) => ({
        id: r.id,
        quantity: r.quantity,
        adjustmentType: r.adjustmentType,
      })),
      startingStockById.get(inventoryId) ?? "0",
    )
    for (const entry of ledger) {
      await tx.flooringInventoryAdjustment.update({
        where: { id: entry.id },
        data: { before: entry.before, after: entry.after },
        select: { id: true },
      })
    }

    results.push({ inventoryId, netDeducted })
  }

  return results
}
