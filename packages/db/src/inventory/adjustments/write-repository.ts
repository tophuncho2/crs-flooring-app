import type { Prisma } from "../../generated/prisma/client.js"
import {
  computeLedgerBeforeAfter,
  computeNetDeducted,
  type FlooringInventoryAdjustmentType,
  type PaletteColor,
  type AdjustmentInventorySnapshot,
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
// Synchronous per-row adjustment primitives, used by the create/update/delete
// adjustment application use cases (adjustments are the entity; the calling
// scope just differs by which identity columns it supplies).
// ---------------------------------------------------------------------------

/**
 * The parent inventory's unit FK at create time (UoM epic 2B). Stamped onto the
 * adjustment on insert and never re-linked — the adjustment keeps its own unit
 * link even if the parent inventory's row is later changed. Replaces the two
 * frozen unit-label snapshot strings (display now derives from the join).
 */
export type AdjustmentUnitSnapshot = {
  unitId: string
}

export type InsertAdjustmentRowInput = {
  /** Direction of the adjustment. */
  adjustmentType: FlooringInventoryAdjustmentType
  /** Always positive in storage; direction lives in `adjustmentType`. */
  quantity: string
  /** Optional work-order link (any product, any direction); `null` = unlinked. */
  workOrderId: string | null
  inventoryId: string
  isWaste: boolean
  /** Empty string accepted; persisted as null when blank. */
  internalNotes: string
  /** Non-semantic palette tag; omitted → DB default SLATE. */
  color?: PaletteColor
  unitSnapshot: AdjustmentUnitSnapshot
  /**
   * Conversion trio stamped from the parent inventory at create (like the unit
   * snapshot). Editable on the adjustment afterward; `null` when the parent has
   * none set. convertedBalance stays derived on read.
   */
  coverageUnitId: string | null
  coveragePerUnit: string | null
  conversionFormulaId: string | null
  /**
   * Identity snapshot from the parent inventory: the 5 underlying primitives
   * (`inventoryNumber`, `rollPrefix`, `rollNumber`, `dyeLot`, `inventoryNote`).
   * Stamped at insert and frozen — never re-stamped.
   */
  inventorySnapshot: AdjustmentInventorySnapshot
  /**
   * User-owned free-text location. Not seeded from the parent inventory and
   * never re-snapped by update-adjustment.
   */
  location: string | null
  /** User-owned free-text area label. User-typed in create + edit; never snapshotted. */
  area: string | null
  /**
   * Derived money share of the parent inventory's cost/freight attributable to
   * this adjustment's quantity. Stamped unsigned at insert; `null` when the
   * parent has no cost/freight. The +/− sign is derived from `adjustmentType`
   * at display, never stored.
   */
  cost: string | null
  freight: string | null
  /** Actor email of the creating user — stamped into both createdBy + updatedBy. */
  createdBy: string
  updatedBy: string
}

/**
 * Single-row insert for the synchronous create flow. Caller has locked the
 * parent inventory FOR UPDATE and read the inventory's unit fields +
 * identity fields. This primitive is a pure
 * persistence call — no business rules, no invariant checks (those run in
 * the use case before/after via the domain).
 *
 * Stamps the unit FK (`unitId`), the seven identity-snapshot fields (the 5
 * identity primitives, plus `productId` / `warehouseId`), and the user-owned
 * `location` from the input.
 *
 * `before` / `after` are left null here; the caller immediately runs
 * `recomputeAndPersistNetDeducted`, which replays the inventory's whole chain
 * in `createdAt` order and stamps `before`/`after` on every row (including this
 * one). `adjustmentNumber` is DB-generated via the sequence default.
 */
export async function insertAdjustmentRow(
  tx: Prisma.TransactionClient,
  input: InsertAdjustmentRowInput,
): Promise<InventoryAdjustmentRecord> {
  const inserted = await tx.flooringInventoryAdjustment.create({
    data: {
      inventoryId: input.inventoryId,
      workOrderId: input.workOrderId,
      adjustmentType: input.adjustmentType,
      quantity: input.quantity,
      isWaste: input.isWaste,
      internalNotes: input.internalNotes ? input.internalNotes : null,
      // Omitted → Prisma applies the column default (SLATE).
      ...(input.color !== undefined ? { color: input.color } : {}),
      unitId: input.unitSnapshot.unitId,
      coverageUnitId: input.coverageUnitId,
      coveragePerUnit: input.coveragePerUnit,
      conversionFormulaId: input.conversionFormulaId,
      inventoryNumber: input.inventorySnapshot.inventoryNumber,
      rollPrefix: input.inventorySnapshot.rollPrefix,
      rollNumber: input.inventorySnapshot.rollNumber,
      dyeLot: input.inventorySnapshot.dyeLot,
      inventoryNote: input.inventorySnapshot.inventoryNote,
      productId: input.inventorySnapshot.productId,
      warehouseId: input.inventorySnapshot.warehouseId,
      location: input.location,
      area: input.area,
      cost: input.cost,
      freight: input.freight,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
    select: adjustmentRowSelect,
  })
  return normalizeAdjustmentRow(inserted)
}

export type UpdateAdjustmentRowPatch = {
  /** Always positive (validator enforces); direction lives in `adjustmentType`. */
  quantity?: string
  /**
   * Direction (INCREASE | DEDUCTION). Freely editable for the row's whole
   * lifecycle — flipping it re-flows the inventory's netDeducted + before/after
   * chain via `recomputeAndPersistNetDeducted`.
   */
  adjustmentType?: FlooringInventoryAdjustmentType
  isWaste?: boolean
  /** Empty string accepted; persisted as null when blank. */
  internalNotes?: string
  /** Non-semantic palette tag. Metadata only — never triggers a ledger recompute. */
  color?: PaletteColor
  /**
   * User-owned free-text location. Written only when the patch carries it
   * (`null` clears it); never re-snapped from the parent inventory.
   */
  location?: string | null
  /**
   * User-owned free-text area label. Written only when the patch carries it
   * (`null` clears it). Metadata only — never triggers a ledger recompute.
   */
  area?: string | null
  /**
   * Work-order link edit. `null` disconnects the relation; a string id
   * connects. Absent leaves the relation untouched. Any product / any
   * direction may link a work order.
   */
  workOrderId?: string | null
  /**
   * Conversion trio — editable on the adjustment. Written only when the patch
   * carries the field; `null` clears it. convertedBalance stays derived on read.
   */
  coverageUnitId?: string | null
  coveragePerUnit?: string | null
  conversionFormulaId?: string | null
  /**
   * Actor email of the editing user — stamped on every human edit, including a
   * metadata-only edit. Set unconditionally (the patch always carries it), so a
   * internalNotes/color/location-only save still records its editor.
   */
  updatedBy: string
}

export type UpdateAdjustmentRowInput = {
  id: string
  patch: UpdateAdjustmentRowPatch
}

/**
 * Single-row update for the synchronous update flow. Caller has read the
 * row + parent inventory, asserted OCC + linkage rules, and locked the
 * parent inventory FOR UPDATE.
 *
 * Writable in this primitive:
 *   - user-editable form fields: `quantity`, `adjustmentType`, `isWaste`,
 *     `internalNotes`, `location`
 *   - the `workOrderId` link relation (any product, any direction)
 *
 * Never written here: `inventoryId`, `before`, `after`, `adjustmentNumber`,
 * `createdAt`, the 5 inventory-identity snapshot primitives, and the
 * stock unit-snapshot fields. Empty-patch calls return the row as-is.
 */
export async function updateAdjustmentRow(
  tx: Prisma.TransactionClient,
  input: UpdateAdjustmentRowInput,
): Promise<InventoryAdjustmentRecord> {
  const data: Prisma.FlooringInventoryAdjustmentUpdateInput = {}
  if (input.patch.quantity !== undefined) data.quantity = input.patch.quantity
  if (input.patch.adjustmentType !== undefined) {
    data.adjustmentType = input.patch.adjustmentType
  }
  if (input.patch.isWaste !== undefined) data.isWaste = input.patch.isWaste
  if (input.patch.internalNotes !== undefined) {
    data.internalNotes = input.patch.internalNotes ? input.patch.internalNotes : null
  }
  if (input.patch.color !== undefined) data.color = input.patch.color
  if (input.patch.location !== undefined) data.location = input.patch.location
  if (input.patch.area !== undefined) data.area = input.patch.area
  if (input.patch.workOrderId !== undefined) {
    data.workOrder =
      input.patch.workOrderId === null
        ? { disconnect: true }
        : { connect: { id: input.patch.workOrderId } }
  }
  if (input.patch.coverageUnitId !== undefined) {
    data.coverageUnit = input.patch.coverageUnitId
      ? { connect: { id: input.patch.coverageUnitId } }
      : { disconnect: true }
  }
  if (input.patch.coveragePerUnit !== undefined) {
    data.coveragePerUnit = input.patch.coveragePerUnit
  }
  if (input.patch.conversionFormulaId !== undefined) {
    data.conversionFormula = input.patch.conversionFormulaId
      ? { connect: { id: input.patch.conversionFormulaId } }
      : { disconnect: true }
  }
  // A human save always records its editor — set unconditionally so even a
  // metadata-only edit (internalNotes/color/location) stamps updatedBy. This also means
  // the write branch below always fires.
  data.updatedBy = input.patch.updatedBy
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

export type DeleteAdjustmentRowInput = {
  id: string
}

/**
 * Single-row delete for the synchronous delete flow. Caller has read the
 * row, asserted OCC, and locked the parent inventory FOR UPDATE. Pure
 * persistence call — any adjustment is freely deletable.
 */
export async function deleteAdjustmentRow(
  tx: Prisma.TransactionClient,
  input: DeleteAdjustmentRowInput,
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
      // LOAD-BEARING INVARIANT: NEVER stamp createdBy/updatedBy here. This loop
      // rewrites before/after on EVERY sibling adjustment — a derived projection
      // of the ledger, not a human edit. updatedBy must stay "last human author"
      // per row; it is stamped in exactly two places (insertAdjustmentRow
      // + updateAdjustmentRow). A sibling's updatedAt does bump here (via
      // @updatedAt) and that divergence is accepted — its stored balance genuinely
      // changed. Do not "fix the oversight" by adding actor writes to this update.
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
