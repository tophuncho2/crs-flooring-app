import type { Prisma } from "../../../generated/prisma/client.js"
import {
  computeTotalCutSum,
  type PendingCutLogInventorySnapshot,
} from "@builders/domain"
import {
  listCutLogsForInventoryIds,
  normalizeCutLogRow,
  type CutLogRecord,
} from "./read-repository.js"
import { cutLogRowSelect } from "./shared.js"

// Every mutating primitive in this file requires a caller-managed
// transaction (`tx: Prisma.TransactionClient` as the first argument). The
// application use case opens the transaction, locks the parent inventory
// row `FOR UPDATE` via `lockInventoryForCutLog` (see `./locks.ts`),
// validates domain invariants, applies the cut-log mutation via these
// primitives, and adjusts `inventory.totalCutSum` in the same transaction
// via `recomputeAndPersistTotalCutSums`.

// ---------------------------------------------------------------------------
// Synchronous per-row pending-cut-log primitives (used by both WO-side and
// inv-side application use cases — cut logs are the entity; the calling
// scope just differs by which identity columns it supplies).
// ---------------------------------------------------------------------------

export type ApplyFinalizeCutLogInput = {
  cutLogId: string
}

export type FinalizeStampedRow = {
  id: string
  before: string
  cut: string
  after: string
}

/**
 * Flips one PENDING cut log to FINAL, stamping `before`/`after` +
 * `finalCutSequence` against the current state of the parent inventory,
 * and re-snapping the denormalized `location` mirror from the parent.
 *
 *   - `existingFinalCutSum` = sum of `cut` over the inventory's rows
 *     where `isFinal: true` AND `void: false` (voided-after-finalized
 *     contribute 0 because their `cut` is `"0"`).
 *   - `maxExistingSequence` = max `finalCutSequence` over the
 *     inventory's rows where `isFinal: true` — INCLUDING
 *     voided-after-final (those keep their sequence, never reused; the
 *     next allocation jumps over their slot).
 *   - `before = startingStock − existingFinalCutSum`,
 *     `after = before − cut`,
 *     `finalCutSequence = maxExistingSequence + 1`.
 *   - `location` is re-stamped from the parent inventory's current value
 *     (denormalized mirror tracks the latest parent location through
 *     create / update / finalize, and clears on void).
 *
 * Returns the stamped values so the caller can defensively assert
 * `before − cut === after` via the domain invariant.
 *
 * Caller takes the parent inventory's FOR UPDATE lock via
 * `lockInventoryForCutLog` (see `./locks.ts`) before this runs. If the cut
 * log id does not resolve to a row, returns `{ stampedRow: null }` — the
 * caller treats that as a no-op success.
 */
export async function applyFinalizeCutLog(
  tx: Prisma.TransactionClient,
  input: ApplyFinalizeCutLogInput,
): Promise<{ stampedRow: FinalizeStampedRow | null }> {
  const target = await tx.flooringCutLog.findUnique({
    where: { id: input.cutLogId },
    select: { id: true, inventoryId: true, cut: true },
  })
  if (target === null) return { stampedRow: null }

  const [inventory, existingFinalRows] = await Promise.all([
    tx.flooringInventory.findUnique({
      where: { id: target.inventoryId },
      select: { startingStock: true, location: true },
    }),
    tx.flooringCutLog.findMany({
      where: { inventoryId: target.inventoryId, isFinal: true },
      select: { cut: true, finalCutSequence: true, void: true },
    }),
  ])
  if (inventory === null) return { stampedRow: null }

  let runningBalance = Number(inventory.startingStock)
  let nextSequence = 1
  for (const row of existingFinalRows) {
    if (!row.void) {
      runningBalance -= Number(row.cut)
    }
    if (row.finalCutSequence !== null && row.finalCutSequence >= nextSequence) {
      nextSequence = row.finalCutSequence + 1
    }
  }

  const cutNum = Number(target.cut)
  const beforeStr = runningBalance.toFixed(2)
  const afterStr = (runningBalance - cutNum).toFixed(2)
  const cutStr = target.cut.toString()

  await tx.flooringCutLog.update({
    where: { id: target.id },
    data: {
      status: "FINAL",
      isFinal: true,
      finalCutSequence: nextSequence,
      before: beforeStr,
      after: afterStr,
      location: inventory.location ?? null,
    },
  })

  return {
    stampedRow: {
      id: target.id,
      before: beforeStr,
      cut: cutStr,
      after: afterStr,
    },
  }
}

/**
 * Snapshot of the parent inventory's unit-of-measure labels at create
 * time. Stamped onto the cut log on insert and never mutated afterward —
 * the cut log keeps its frozen labels even if the parent inventory's
 * UoM is later edited.
 */
export type PendingCutLogUnitSnapshot = {
  stockUnitName: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitName: string | null
  itemCoverageUnitAbbrev: string | null
}

export type InsertPendingCutLogRowInput = {
  workOrderId: string
  workOrderItemId: string
  inventoryId: string
  cut: string
  /**
   * Pre-derived by the use case via the domain's `computeCutCoverage`
   * against the parent inventory's `coveragePerUnit` + `categorySlug`.
   * `null` when the inventory's category lacks a coverage unit, or when
   * `coveragePerUnit` is null.
   */
  coverageCut: string | null
  isWaste: boolean
  /** Empty string accepted; persisted as null when blank. */
  notes: string
  unitSnapshot: PendingCutLogUnitSnapshot
  /**
   * Identity snapshot from the parent inventory: the composed
   * `inventoryItem` string + `categorySlug` + the 5 underlying primitives
   * (`inventoryNumber`, `rollPrefix`, `rollNumber`, `dyeLot`,
   * `inventoryNote`). Stamped at insert and frozen — neither finalize nor
   * void re-stamps these.
   */
  inventorySnapshot: PendingCutLogInventorySnapshot
  /**
   * Parent inventory's `location` at insert time. Stored as a denormalized
   * mirror — re-stamped by update-pending and finalize, cleared by void.
   * Carried as a top-level parameter (not part of `inventorySnapshot`)
   * because its semantics differ: snapshot fields are frozen, this field
   * tracks the parent.
   */
  location: string | null
}

/**
 * Single-row insert for the synchronous create flow. Caller has locked the
 * parent inventory FOR UPDATE and read the inventory's unit fields +
 * identity fields + computed `coverageCut`. This primitive is a pure
 * persistence call — no business rules, no invariant checks (those run in
 * the use case before/after via the domain).
 *
 * Stamps the four unit-snapshot fields, the ten identity-snapshot fields
 * (`inventoryItem`, `categorySlug`, the 5 identity primitives, plus
 * `productId` / `productName` / `warehouseId`), and the `location` mirror
 * from the input (which the use case sourced from the parent inventory).
 * After this insert returns, the snapshot fields are immutable on the
 * cut log; `location` is mutable (re-stamped on update / finalize,
 * cleared on void).
 *
 * Worker-only fields stay at their schema defaults / null:
 *   - `before` / `after` / `finalCutSequence`: null (finalize stamps them).
 *   - `status`: defaults to `PENDING`.
 *   - `isFinal` / `void`: default false.
 *   - `cutLogNumber`: DB-generated via the sequence default.
 */
export async function insertPendingCutLogRow(
  tx: Prisma.TransactionClient,
  input: InsertPendingCutLogRowInput,
): Promise<CutLogRecord> {
  const inserted = await tx.flooringCutLog.create({
    data: {
      inventoryId: input.inventoryId,
      workOrderId: input.workOrderId,
      workOrderItemId: input.workOrderItemId,
      cut: input.cut,
      coverageCut: input.coverageCut,
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
      productName: input.inventorySnapshot.productName,
      warehouseId: input.inventorySnapshot.warehouseId,
      location: input.location,
    },
    select: cutLogRowSelect,
  })
  return normalizeCutLogRow(inserted)
}

export type UpdatePendingCutLogRowPatch = {
  cut?: string
  /**
   * Re-derived by the use case when (and only when) `cut` is in the
   * patch. Carries `null` if the parent inventory's category doesn't
   * support coverage. Absent when `cut` didn't change.
   */
  coverageCut?: string | null
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
   * WO/WOMI link edits. Both move together per
   * `assertCutLogLinkageSymmetry` (enforced by the use case before
   * calling here). `null` disconnects the relation; a string id
   * connects. Absent fields leave the relation untouched.
   */
  workOrderId?: string | null
  workOrderItemId?: string | null
}

export type UpdatePendingCutLogRowInput = {
  id: string
  patch: UpdatePendingCutLogRowPatch
}

/**
 * Single-row update for the synchronous update flow. Caller has read the
 * row + parent inventory, asserted PENDING status + OCC + linkage
 * symmetry, and locked the parent inventory FOR UPDATE.
 *
 * Writable in this primitive:
 *   - user-editable form fields: `cut`, `isWaste`, `notes`
 *   - use-case-recomputed `coverageCut`
 *   - denormalized mirror `location` (re-snapped from parent)
 *   - link relations `workOrderId` / `workOrderItemId` (both-or-neither,
 *     enforced upstream)
 *
 * Never written here: `inventoryId`, `status`, `isFinal`, `void`,
 * `before`, `after`, `finalCutSequence`, `cutLogNumber`, `createdAt`,
 * `inventoryItem`, the 5 inventory-identity snapshot primitives, and
 * the four unit-snapshot fields. Empty-patch calls return the row as-is.
 */
export async function updatePendingCutLogRow(
  tx: Prisma.TransactionClient,
  input: UpdatePendingCutLogRowInput,
): Promise<CutLogRecord> {
  const data: Prisma.FlooringCutLogUpdateInput = {}
  if (input.patch.cut !== undefined) data.cut = input.patch.cut
  if (input.patch.coverageCut !== undefined) data.coverageCut = input.patch.coverageCut
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
      ? await tx.flooringCutLog.update({
          where: { id: input.id },
          data,
          select: cutLogRowSelect,
        })
      : await tx.flooringCutLog.findUniqueOrThrow({
          where: { id: input.id },
          select: cutLogRowSelect,
        })
  return normalizeCutLogRow(updated)
}

export type DeletePendingCutLogRowInput = {
  id: string
}

/**
 * Single-row delete for the synchronous delete flow. Caller has read the
 * row, asserted PENDING status (so finals can't be deleted) + OCC +
 * linkage, and locked the parent inventory FOR UPDATE. Pure persistence
 * call.
 */
export async function deletePendingCutLogRow(
  tx: Prisma.TransactionClient,
  input: DeletePendingCutLogRowInput,
): Promise<void> {
  await tx.flooringCutLog.delete({ where: { id: input.id } })
}

/**
 * For each inventory id in the input, recomputes `totalCutSum` from its
 * non-void cut logs (via the domain's pure `computeTotalCutSum`) and
 * persists the new value. Application layer asserts the
 * `totalCutSum ≤ startingStock` invariant separately via
 * `assertCutSumWithinStartingStock`.
 *
 * Co-located with the cut-log write primitives (rather than under the
 * inventory write-repo) because every caller is "wrote a cut log → now
 * reconcile the parent inventory totalCutSum" — the functional cohesion
 * keeps callers from hopping between modules.
 */
export async function recomputeAndPersistTotalCutSums(
  tx: Prisma.TransactionClient,
  inventoryIds: string[],
): Promise<Array<{ inventoryId: string; totalCutSum: string }>> {
  if (inventoryIds.length === 0) return []

  const rows = await listCutLogsForInventoryIds(inventoryIds, tx)

  const grouped = new Map<string, Array<{ cut: string; void: boolean }>>()
  for (const id of inventoryIds) {
    grouped.set(id, [])
  }
  for (const row of rows) {
    grouped.get(row.inventoryId)?.push({ cut: row.cut, void: row.void })
  }

  const results: Array<{ inventoryId: string; totalCutSum: string }> = []
  for (const [inventoryId, group] of grouped) {
    const totalCutSum = computeTotalCutSum(group)
    await tx.flooringInventory.update({
      where: { id: inventoryId },
      data: { totalCutSum },
      select: { id: true },
    })
    results.push({ inventoryId, totalCutSum })
  }

  return results
}
