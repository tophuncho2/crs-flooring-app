import { Prisma } from "@prisma/client"
import {
  computeTotalCutSum,
  type PendingCutLogInventorySnapshot,
} from "@builders/domain"
import {
  normalizeCutLogRow,
  type CutLogRecord,
} from "../../inventory/cut-logs/read-repository.js"
import { cutLogRowSelect } from "../../inventory/cut-logs/shared.js"
import { listCutLogsForInventoryIds } from "./read-repository.js"

/**
 * Single-inventory FOR UPDATE locker. Acquires a row lock on the parent
 * inventory for the duration of the caller's transaction.
 *
 * Cut-log finalize is one-row-at-a-time, so there is no deterministic
 * multi-inventory ordering concern — each finalize touches exactly one
 * inventory. Concurrent finalizes against the same inventory serialize
 * on this lock; concurrent finalizes against different inventories run
 * in parallel.
 *
 * Uses the same single-id `Prisma.sql` pattern as every other locker in
 * the codebase (inventory-side `pending-save`, `finalize`, `void`,
 * `flooring_import_entry`, `flooring_work_order_file`).
 */
export async function lockInventoryForCutLog(
  tx: Prisma.TransactionClient,
  inventoryId: string,
): Promise<void> {
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ${inventoryId} FOR UPDATE`,
  )
}

export type ApplyFinalizeWorkOrderCutLogInput = {
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
 * `finalCutSequence` against the current state of the parent inventory.
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
 *
 * Returns the stamped values so the caller can defensively assert
 * `before − cut === after` via the domain invariant. The data layer
 * itself doesn't throw — keeps it free of business-rule assertions per
 * `packages/db/CLAUDE.md`.
 *
 * Caller takes the parent inventory's FOR UPDATE lock (via
 * `lockInventoryForCutLog`) before this runs. If the cut log id does
 * not resolve to a row, returns `{ stampedRow: null }` — the caller
 * (apply use case) treats that as a no-op success.
 */
export async function applyFinalizeWorkOrderCutLog(
  tx: Prisma.TransactionClient,
  input: ApplyFinalizeWorkOrderCutLogInput,
): Promise<{ stampedRow: FinalizeStampedRow | null }> {
  const target = await tx.flooringCutLog.findUnique({
    where: { id: input.cutLogId },
    select: { id: true, inventoryId: true, cut: true },
  })
  if (target === null) return { stampedRow: null }

  const [inventory, existingFinalRows] = await Promise.all([
    tx.flooringInventory.findUnique({
      where: { id: target.inventoryId },
      select: { startingStock: true },
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

// ---------------------------------------------------------------------------
// Per-row pending-cut-log primitives (synchronous WO-side mutations)
// ---------------------------------------------------------------------------

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
   * Identity snapshot from the parent inventory: a copy of
   * `inventory.inventoryItem` (the denormalized `inv# · roll# · location ·
   * dyeLot · note` string) plus `categorySlug`. Stamped at insert and
   * frozen — finalize and void do not re-stamp. Lets the cut-log subgrid
   * render its Inventory column directly off the cut log row instead of
   * resolving via a per-WOMI eligible-inventory fetch.
   */
  inventorySnapshot: PendingCutLogInventorySnapshot
}

/**
 * Single-row insert for the synchronous WO-side create flow. Caller has
 * locked the parent inventory FOR UPDATE and read the inventory's unit
 * fields + identity fields + computed `coverageCut`. This primitive is a
 * pure persistence call — no business rules, no invariant checks (those
 * run in the use case before/after via the domain).
 *
 * Stamps the four unit-snapshot fields and the four identity-snapshot
 * fields from the input (which the use case sourced from the parent
 * inventory). After this insert returns, the snapshot fields are
 * immutable on the cut log — no primitive in this file writes them again.
 *
 * Worker-only fields stay at their schema defaults / null:
 *   - `before` / `after` / `finalCutSequence`: null (finalize worker
 *     stamps them).
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
}

export type UpdatePendingCutLogRowInput = {
  id: string
  patch: UpdatePendingCutLogRowPatch
}

/**
 * Single-row update for the synchronous WO-side update flow. Caller
 * has read the row + parent inventory, asserted PENDING status + OCC
 * + linkage, and locked the parent inventory FOR UPDATE.
 *
 * The patch is intentionally narrow: only the user-editable fields plus
 * the use-case-recomputed `coverageCut`. Linkage columns (`workOrderId`
 * / `workOrderItemId` / `inventoryId`), `status`, `isFinal`, `void`,
 * `before`, `after`, `finalCutSequence`, `cutLogNumber`, `createdAt`,
 * `inventoryItem`, and the four unit-snapshot fields are never written
 * here. Empty-patch calls return the row as-is.
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
 * Single-row delete for the synchronous WO-side delete flow. Caller
 * has read the row, asserted PENDING status (so finals can't be
 * deleted) + OCC + linkage, and locked the parent inventory FOR
 * UPDATE. Pure persistence call.
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
