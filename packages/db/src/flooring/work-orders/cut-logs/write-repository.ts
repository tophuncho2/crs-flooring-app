import { Prisma } from "@prisma/client"
import { computeTotalCutSum } from "@builders/domain"
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

/**
 * Flips the listed PENDING cut logs to FINAL with deterministic
 * `finalCutSequence` per inventory. Sequence is assigned per-inventory
 * by max(finalCutSequence) + N over the existing FINAL rows for that
 * inventory.
 *
 * Caller takes the multi-inventory FOR UPDATE lock (via
 * `lockInventoriesForCutLogBatch`) before this runs.
 */
export async function applyFinalizeWorkOrderCutLogBatch(
  tx: Prisma.TransactionClient,
  input: ApplyFinalizeWorkOrderCutLogBatchInput,
): Promise<void> {
  if (input.cutLogIds.length === 0) return

  const targets = await tx.flooringCutLog.findMany({
    where: { id: { in: input.cutLogIds } },
    select: { id: true, inventoryId: true, createdAt: true },
    orderBy: [{ inventoryId: "asc" }, { createdAt: "asc" }],
  })

  const targetsByInventory = new Map<string, Array<{ id: string }>>()
  for (const t of targets) {
    const list = targetsByInventory.get(t.inventoryId) ?? []
    list.push({ id: t.id })
    targetsByInventory.set(t.inventoryId, list)
  }

  for (const [inventoryId, rows] of targetsByInventory) {
    const maxSequenceRow = await tx.flooringCutLog.findFirst({
      where: { inventoryId, isFinal: true },
      orderBy: { finalCutSequence: "desc" },
      select: { finalCutSequence: true },
    })
    let nextSequence = (maxSequenceRow?.finalCutSequence ?? 0) + 1

    for (const row of rows) {
      await tx.flooringCutLog.update({
        where: { id: row.id },
        data: {
          status: "FINAL",
          isFinal: true,
          finalCutSequence: nextSequence,
        },
      })
      nextSequence += 1
    }
  }
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
