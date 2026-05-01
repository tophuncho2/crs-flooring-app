import { Prisma } from "@prisma/client"
import { computeTotalCutSum } from "@builders/domain"
import {
  normalizeCutLogRow,
  type CutLogRecord,
} from "../../inventory/cut-logs/read-repository.js"
import { cutLogRowSelect } from "../../inventory/cut-logs/shared.js"
import { listCutLogsForInventoryIds } from "./read-repository.js"

/**
 * Multi-inventory deterministic FOR UPDATE locker. Sorts the inventory
 * id set ascending, then acquires a single-row `FOR UPDATE` lock per id
 * in that order. Deterministic ordering avoids deadlocks when two
 * concurrent WO-side cut-log batches touch overlapping inventories.
 *
 * Uses the same single-id `Prisma.sql` pattern as every other locker in
 * the codebase (inventory-side `pending-save`, `finalize`, `void`,
 * `flooring_import_entry`, `flooring_work_order_file`).
 */
export async function lockInventoriesForCutLogBatch(
  tx: Prisma.TransactionClient,
  inventoryIds: string[],
): Promise<void> {
  if (inventoryIds.length === 0) return
  const unique = Array.from(new Set(inventoryIds)).sort()
  for (const id of unique) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ${id} FOR UPDATE`,
    )
  }
}

export type WorkOrderCutLogPendingDraftInput = {
  id: string
  tempId: string
  inventoryId: string
  cut: string
  /**
   * Pre-derived by the consumer use case from the inventory's
   * `coveragePerUnit` + `categorySlug` (via the domain's
   * `computeCutCoverage`). `null` when the inventory's category lacks a
   * coverage unit, or when `coveragePerUnit` is null.
   */
  coverageCut: string | null
  isWaste: boolean
  notes: string
}

export type WorkOrderCutLogPendingUpdateInput = {
  id: string
  expectedUpdatedAt: string
  patch: {
    cut?: string
    /**
     * Re-derived by the consumer when (and only when) `cut` is in the
     * patch. Carries `null` if the parent inventory's category doesn't
     * support coverage. Absent when `cut` didn't change.
     */
    coverageCut?: string | null
    isWaste?: boolean
    notes?: string
  }
}

export type WorkOrderCutLogPendingDeleteInput = {
  id: string
  expectedUpdatedAt: string
}

export type ApplyWorkOrderItemCutLogPendingDiffInput = {
  workOrderId: string
  workOrderItemId: string
  drafts: WorkOrderCutLogPendingDraftInput[]
  updates: WorkOrderCutLogPendingUpdateInput[]
  deletes: WorkOrderCutLogPendingDeleteInput[]
}

/**
 * Applies a pending-cut-log diff under the WO record view's scope. Every
 * draft is stamped with both linkage columns (`workOrderId` +
 * `workOrderItemId`) — the producer use case asserts symmetry via
 * `assertCutLogLinkageSymmetry` before calling here.
 *
 * `before`, `after`, `finalCutSequence`, `cost`, `freight` are NOT set
 * here. `before`/`after`/`finalCutSequence` are stamped at finalize
 * time. `cost`/`freight` are never written on the WO side.
 *
 * `coverageCut` is pre-derived by the consumer (it needs the parent
 * inventory's `coveragePerUnit` and `categorySlug`, which are read once
 * under the FOR UPDATE lock and applied via `computeCutCoverage`).
 *
 * Caller is responsible for taking the multi-inventory FOR UPDATE lock
 * (via `lockInventoriesForCutLogBatch`) before this function runs.
 *
 * `createMany` runs with `skipDuplicates: true` so a retried worker job
 * is a no-op against the producer-stamped UUIDs already in the table.
 */
export async function applyWorkOrderItemCutLogPendingDiff(
  tx: Prisma.TransactionClient,
  input: ApplyWorkOrderItemCutLogPendingDiffInput,
): Promise<{ tempIdMap: Record<string, string> }> {
  if (input.deletes.length > 0) {
    await tx.flooringCutLog.deleteMany({
      where: { id: { in: input.deletes.map((d) => d.id) } },
    })
  }

  const tempIdMap: Record<string, string> = {}
  for (const draft of input.drafts) {
    tempIdMap[draft.tempId] = draft.id
  }

  if (input.drafts.length > 0) {
    const createRows: Array<Prisma.FlooringCutLogCreateManyInput> = input.drafts.map(
      (draft) => ({
        id: draft.id,
        inventoryId: draft.inventoryId,
        workOrderId: input.workOrderId,
        workOrderItemId: input.workOrderItemId,
        cut: draft.cut,
        coverageCut: draft.coverageCut,
        isWaste: draft.isWaste,
        notes: draft.notes ? draft.notes : null,
        // before, after: null (stamped at finalize time)
        // finalCutSequence: null (allocated at finalize time)
        // cost, freight: null (never written on WO side)
        // status defaults to PENDING; isFinal defaults to false; void defaults to false
        // cutLogNumber is DB-generated via sequence
      }),
    )

    await tx.flooringCutLog.createMany({
      data: createRows,
      skipDuplicates: true,
    })
  }

  for (const update of input.updates) {
    await tx.flooringCutLog.update({
      where: { id: update.id },
      data: {
        ...(update.patch.cut !== undefined ? { cut: update.patch.cut } : {}),
        ...(update.patch.coverageCut !== undefined
          ? { coverageCut: update.patch.coverageCut }
          : {}),
        ...(update.patch.isWaste !== undefined ? { isWaste: update.patch.isWaste } : {}),
        ...(update.patch.notes !== undefined
          ? { notes: update.patch.notes ? update.patch.notes : null }
          : {}),
      },
    })
  }

  return { tempIdMap }
}

export type ApplyFinalizeWorkOrderCutLogBatchInput = {
  cutLogIds: string[]
}

export type FinalizeStampedRow = {
  id: string
  before: string
  cut: string
  after: string
}

/**
 * Flips the listed PENDING cut logs to FINAL, stamping `before`/`after`
 * + `finalCutSequence` deterministically per inventory.
 *
 * Per touched inventory:
 *   - `existingFinalCutSum` = sum of `cut` over rows where `isFinal:
 *     true` AND `void: false` (voided-after-finalized contribute 0
 *     because their `cut` is `"0"`).
 *   - `maxExistingSequence` = max `finalCutSequence` over rows where
 *     `isFinal: true` — INCLUDING voided-after-final (those keep their
 *     sequence, never reused; the next allocation jumps over their
 *     slot).
 *   - `runningBalance = startingStock − existingFinalCutSum` is the
 *     starting point for the walk.
 *   - `nextSequence = maxExistingSequence + 1`.
 *   - The batch's rows for this inventory are walked in `createdAt
 *     asc`. For each: `before = runningBalance`, `after = before − cut`,
 *     then advance both `runningBalance` and `nextSequence`.
 *
 * Returns the per-row stamped values so the caller can defensively
 * assert `before − cut === after` via the domain invariant. The data
 * layer itself doesn't throw — keeps it free of business-rule
 * assertions per `packages/db/CLAUDE.md`.
 *
 * Caller takes the multi-inventory FOR UPDATE lock (via
 * `lockInventoriesForCutLogBatch`) before this runs.
 */
export async function applyFinalizeWorkOrderCutLogBatch(
  tx: Prisma.TransactionClient,
  input: ApplyFinalizeWorkOrderCutLogBatchInput,
): Promise<{ stampedRows: FinalizeStampedRow[] }> {
  if (input.cutLogIds.length === 0) return { stampedRows: [] }

  const targets = await tx.flooringCutLog.findMany({
    where: { id: { in: input.cutLogIds } },
    select: { id: true, inventoryId: true, cut: true, createdAt: true },
    orderBy: [{ inventoryId: "asc" }, { createdAt: "asc" }],
  })

  const inventoryIds = Array.from(new Set(targets.map((t) => t.inventoryId)))

  const [inventoryRows, existingFinalRows] = await Promise.all([
    tx.flooringInventory.findMany({
      where: { id: { in: inventoryIds } },
      select: { id: true, startingStock: true },
    }),
    tx.flooringCutLog.findMany({
      where: { inventoryId: { in: inventoryIds }, isFinal: true },
      select: { inventoryId: true, cut: true, finalCutSequence: true, void: true },
    }),
  ])

  const startingStockById = new Map(
    inventoryRows.map((r) => [r.id, Number(r.startingStock)]),
  )

  type InventoryWalkState = { runningBalance: number; nextSequence: number }
  const stateByInventory = new Map<string, InventoryWalkState>()
  for (const id of inventoryIds) {
    stateByInventory.set(id, {
      runningBalance: startingStockById.get(id) ?? 0,
      nextSequence: 1,
    })
  }
  for (const row of existingFinalRows) {
    const state = stateByInventory.get(row.inventoryId)
    if (state === undefined) continue
    if (!row.void) {
      state.runningBalance -= Number(row.cut)
    }
    if (row.finalCutSequence !== null && row.finalCutSequence >= state.nextSequence) {
      state.nextSequence = row.finalCutSequence + 1
    }
  }

  const stampedRows: FinalizeStampedRow[] = []

  for (const target of targets) {
    const state = stateByInventory.get(target.inventoryId)
    if (state === undefined) continue
    const cutNum = Number(target.cut)
    const beforeNum = state.runningBalance
    const afterNum = beforeNum - cutNum
    const beforeStr = beforeNum.toFixed(2)
    const afterStr = afterNum.toFixed(2)
    const cutStr = target.cut.toString()

    await tx.flooringCutLog.update({
      where: { id: target.id },
      data: {
        status: "FINAL",
        isFinal: true,
        finalCutSequence: state.nextSequence,
        before: beforeStr,
        after: afterStr,
      },
    })

    stampedRows.push({
      id: target.id,
      before: beforeStr,
      cut: cutStr,
      after: afterStr,
    })

    state.runningBalance = afterNum
    state.nextSequence += 1
  }

  return { stampedRows }
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
}

/**
 * Single-row insert for the synchronous WO-side create flow. Caller has
 * locked the parent inventory FOR UPDATE and read the inventory's unit
 * fields + computed `coverageCut`. This primitive is a pure persistence
 * call — no business rules, no invariant checks (those run in the use
 * case before/after via the domain).
 *
 * Stamps the four unit-snapshot fields from the input (which the use
 * case sourced from the parent inventory). After this insert returns,
 * the unit-snapshot fields are immutable on the cut log — no
 * primitive in this file writes them again.
 *
 * Worker-only fields stay at their schema defaults / null:
 *   - `before` / `after` / `finalCutSequence`: null (finalize worker
 *     stamps them).
 *   - `cost` / `freight`: null (never written on the WO side).
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
 * `before`, `after`, `finalCutSequence`, `cost`, `freight`,
 * `cutLogNumber`, `createdAt`, and the four unit-snapshot fields are
 * never written here. Empty-patch calls return the row as-is.
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
