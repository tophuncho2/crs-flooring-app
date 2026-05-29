import type { Prisma } from "../../../generated/prisma/client.js"
import {
  computeNetDeducted,
  signedDelta,
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

export type ApplyFinalizeAdjustmentInput = {
  adjustmentId: string
}

export type FinalizeStampedRow = {
  id: string
  before: string
  signedDelta: string
  after: string
}

/**
 * Flips one PENDING adjustment to FINAL, stamping `before`/`after` +
 * `finalSequence` against the current state of the parent inventory, and
 * re-snapping the denormalized `location` mirror from the parent.
 *
 *   - `existingNetDeducted` = Σ signedDelta(row) over the inventory's rows
 *     where `isFinal: true`. DEDUCTIONs add their quantity, INCREASEs
 *     subtract.
 *   - `maxExistingSequence` = max `finalSequence` over the same set; the
 *     next allocation is one greater.
 *   - `before = startingStock − existingNetDeducted`,
 *     `after  = before − signedDelta(targetRow)`,
 *     `finalSequence = maxExistingSequence + 1`.
 *   - `location` is re-stamped from the parent inventory's current value
 *     (denormalized mirror tracks the latest parent location through
 *     create / update / finalize).
 *
 * Returns the stamped values so the caller can defensively assert
 * `before − signedDelta === after` via the domain invariant.
 *
 * Caller takes the parent inventory's FOR UPDATE lock via
 * `lockInventoryForAdjustment` (see `./locks.ts`) before this runs. If the
 * adjustment id does not resolve to a row, returns `{ stampedRow: null }` —
 * the caller treats that as a no-op success.
 */
export async function applyFinalizeAdjustment(
  tx: Prisma.TransactionClient,
  input: ApplyFinalizeAdjustmentInput,
): Promise<{ stampedRow: FinalizeStampedRow | null }> {
  const target = await tx.flooringInventoryAdjustment.findUnique({
    where: { id: input.adjustmentId },
    select: { id: true, inventoryId: true, quantity: true, adjustmentType: true },
  })
  if (target === null) return { stampedRow: null }

  const [inventory, existingFinalRows] = await Promise.all([
    tx.flooringInventory.findUnique({
      where: { id: target.inventoryId },
      select: { startingStock: true, location: true },
    }),
    tx.flooringInventoryAdjustment.findMany({
      where: { inventoryId: target.inventoryId, isFinal: true },
      select: { quantity: true, adjustmentType: true, finalSequence: true },
    }),
  ])
  if (inventory === null) return { stampedRow: null }

  let runningBalance = Number(inventory.startingStock)
  let nextSequence = 1
  for (const row of existingFinalRows) {
    runningBalance -= signedDelta({
      quantity: row.quantity.toString(),
      adjustmentType: row.adjustmentType,
    })
    if (row.finalSequence !== null && row.finalSequence >= nextSequence) {
      nextSequence = row.finalSequence + 1
    }
  }

  const targetSignedDelta = signedDelta({
    quantity: target.quantity.toString(),
    adjustmentType: target.adjustmentType,
  })
  const beforeStr = runningBalance.toFixed(2)
  const afterStr = (runningBalance - targetSignedDelta).toFixed(2)
  const signedDeltaStr = targetSignedDelta.toFixed(2)

  await tx.flooringInventoryAdjustment.update({
    where: { id: target.id },
    data: {
      status: "FINAL",
      isFinal: true,
      finalSequence: nextSequence,
      before: beforeStr,
      after: afterStr,
      location: inventory.location ?? null,
    },
  })

  return {
    stampedRow: {
      id: target.id,
      before: beforeStr,
      signedDelta: signedDeltaStr,
      after: afterStr,
    },
  }
}

/**
 * Snapshot of the parent inventory's unit-of-measure labels at create
 * time. Stamped onto the adjustment on insert and never mutated afterward —
 * the adjustment keeps its frozen labels even if the parent inventory's
 * UoM is later edited.
 */
export type PendingAdjustmentUnitSnapshot = {
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
}

export type InsertPendingAdjustmentRowInput = {
  /** Direction of the adjustment. INCREASE may never carry a WO link. */
  adjustmentType: FlooringInventoryAdjustmentType
  /** Always positive in storage; direction lives in `adjustmentType`. */
  quantity: string
  /**
   * Pre-derived by the use case via the domain's `computeAdjustmentCoverage`
   * against the parent inventory's `coveragePerUnit` + `categorySlug`.
   * `null` when the inventory's category lacks a coverage unit, or when
   * `coveragePerUnit` is null. Computed the same way for INCREASE and
   * DEDUCTION rows.
   */
  coverage: string | null
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
   * `inventoryNote`). Stamped at insert and frozen — finalize does not
   * re-stamp these.
   */
  inventorySnapshot: PendingAdjustmentInventorySnapshot
  /**
   * Parent inventory's `location` at insert time. Stored as a denormalized
   * mirror — re-stamped by update-pending and finalize.
   */
  location: string | null
}

/**
 * Single-row insert for the synchronous create flow. Caller has locked the
 * parent inventory FOR UPDATE and read the inventory's unit fields +
 * identity fields + computed `coverage`. This primitive is a pure
 * persistence call — no business rules, no invariant checks (those run in
 * the use case before/after via the domain).
 *
 * Stamps the four unit-snapshot fields, the nine identity-snapshot fields
 * (`inventoryItem`, `categorySlug`, the 5 identity primitives, plus
 * `productId` / `warehouseId`), and the `location` mirror from the input.
 *
 * Worker-only fields stay at their schema defaults / null:
 *   - `before` / `after` / `finalSequence`: null (finalize stamps them).
 *   - `status`: defaults to `PENDING`.
 *   - `isFinal`: defaults to false.
 *   - `adjustmentNumber`: DB-generated via the sequence default.
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
      coverage: input.coverage,
      isWaste: input.isWaste,
      notes: input.notes ? input.notes : null,
      stockUnitName: input.unitSnapshot.stockUnitName,
      stockUnitAbbrev: input.unitSnapshot.stockUnitAbbrev,
      itemCoverageUnitName: input.unitSnapshot.itemCoverageUnitName,
      itemCoverageUnitAbbrev: input.unitSnapshot.itemCoverageUnitAbbrev,
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
  /**
   * Re-derived by the use case when (and only when) `quantity` is in the
   * patch. Carries `null` if the parent inventory's category doesn't
   * support coverage. Absent when `quantity` didn't change.
   */
  coverage?: string | null
  isWaste?: boolean
  /** Empty string accepted; persisted as null when blank. */
  notes?: string
  /**
   * Re-snapped from the parent inventory by the use case on every
   * update-pending call (denormalized mirror semantics). Use case passes
   * the parent's current value; data primitive trusts it.
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
 *   - user-editable form fields: `quantity`, `isWaste`, `notes`
 *   - use-case-recomputed `coverage`
 *   - denormalized mirror `location` (re-snapped from parent)
 *   - link relations `workOrderId` / `workOrderItemId` (both-or-neither
 *     for DEDUCTION; forbidden on INCREASE — enforced upstream)
 *
 * Never written here: `inventoryId`, `adjustmentType`, `status`, `isFinal`,
 * `before`, `after`, `finalSequence`, `adjustmentNumber`, `createdAt`,
 * `inventoryItem`, the 5 inventory-identity snapshot primitives, and the
 * four unit-snapshot fields. Empty-patch calls return the row as-is.
 */
export async function updatePendingAdjustmentRow(
  tx: Prisma.TransactionClient,
  input: UpdatePendingAdjustmentRowInput,
): Promise<InventoryAdjustmentRecord> {
  const data: Prisma.FlooringInventoryAdjustmentUpdateInput = {}
  if (input.patch.quantity !== undefined) data.quantity = input.patch.quantity
  if (input.patch.coverage !== undefined) data.coverage = input.patch.coverage
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

/**
 * For each inventory id in the input, recomputes `netDeducted` from its
 * adjustments (via the domain's pure `computeNetDeducted`) and persists
 * the new value. INCREASE rows contribute as negative deltas; DEDUCTION
 * rows as positive. Application layer asserts the
 * `netDeducted ≤ startingStock` invariant separately via
 * `assertNetDeductedWithinStartingStock`.
 *
 * Co-located with the adjustment write primitives because every caller is
 * "wrote an adjustment → now reconcile the parent inventory netDeducted" —
 * the functional cohesion keeps callers from hopping between modules.
 */
export async function recomputeAndPersistNetDeducted(
  tx: Prisma.TransactionClient,
  inventoryIds: string[],
): Promise<Array<{ inventoryId: string; netDeducted: string }>> {
  if (inventoryIds.length === 0) return []

  const rows = await listAdjustmentsForInventoryIds(inventoryIds, tx)

  const grouped = new Map<
    string,
    Array<{ quantity: string; adjustmentType: FlooringInventoryAdjustmentType }>
  >()
  for (const id of inventoryIds) {
    grouped.set(id, [])
  }
  for (const row of rows) {
    grouped
      .get(row.inventoryId)
      ?.push({ quantity: row.quantity, adjustmentType: row.adjustmentType })
  }

  const results: Array<{ inventoryId: string; netDeducted: string }> = []
  for (const [inventoryId, group] of grouped) {
    const netDeducted = computeNetDeducted(group)
    await tx.flooringInventory.update({
      where: { id: inventoryId },
      data: { netDeducted },
      select: { id: true },
    })
    results.push({ inventoryId, netDeducted })
  }

  return results
}
