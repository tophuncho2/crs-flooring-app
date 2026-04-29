import { Prisma } from "@prisma/client"
import { computeTotalCutSum } from "@builders/domain"
import { listCutLogsForInventoryIds } from "./read-repository.js"

/**
 * Multi-inventory deterministic FOR UPDATE locker. Sorts the inventory
 * id set ascending, then takes a single `SELECT ... FOR UPDATE` over the
 * sorted id array. Deterministic ordering avoids deadlocks when two
 * concurrent WO-side cut-log batches touch overlapping inventories.
 *
 * First multi-inventory locker in the codebase. Single-inventory cut-log
 * workers (inventory-side `pending-save`, `finalize`, `void`) use the
 * single-id variant elsewhere.
 */
export async function lockInventoriesForCutLogBatch(
  tx: Prisma.TransactionClient,
  inventoryIds: string[],
): Promise<void> {
  if (inventoryIds.length === 0) return
  const unique = Array.from(new Set(inventoryIds)).sort()
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ANY(${unique}::uuid[]) ORDER BY "id" FOR UPDATE`,
  )
}

export type WorkOrderCutLogPendingDraftInput = {
  id: string
  tempId: string
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
}

export type WorkOrderCutLogPendingUpdateInput = {
  id: string
  expectedUpdatedAt: string
  patch: {
    cut?: string
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
 * `cost` and `freight` are intentionally written as null on every draft
 * — WO-side cut logs do not surface those columns (locked decision #3).
 *
 * Caller is responsible for taking the multi-inventory FOR UPDATE lock
 * (via `lockInventoriesForCutLogBatch`) before this function runs.
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
    // Drafts need `before` + `after` populated. The before is current
    // inventory.startingStock - existing totalCutSum (post-delete). After
    // is before - cut. Worker computes these AFTER deletes are applied
    // and the per-inventory remaining is known.
    //
    // We resolve them up front via a per-inventory snapshot of the
    // remaining stock so each draft's before/after is consistent within
    // the locked TX.
    const inventoryIds = Array.from(new Set(input.drafts.map((d) => d.inventoryId)))
    const inventories = await tx.flooringInventory.findMany({
      where: { id: { in: inventoryIds } },
      select: { id: true, startingStock: true, totalCutSum: true },
    })
    const remainingByInventory = new Map<string, number>()
    for (const inv of inventories) {
      remainingByInventory.set(inv.id, Number(inv.startingStock) - Number(inv.totalCutSum))
    }

    const draftsByInventory = new Map<string, WorkOrderCutLogPendingDraftInput[]>()
    for (const draft of input.drafts) {
      const list = draftsByInventory.get(draft.inventoryId) ?? []
      list.push(draft)
      draftsByInventory.set(draft.inventoryId, list)
    }

    const createRows: Array<Prisma.FlooringCutLogCreateManyInput> = []
    for (const [inventoryId, drafts] of draftsByInventory) {
      let runningRemaining = remainingByInventory.get(inventoryId) ?? 0
      for (const draft of drafts) {
        const cutValue = Number(draft.cut)
        const before = runningRemaining
        const after = before - (Number.isFinite(cutValue) ? cutValue : 0)
        runningRemaining = after
        createRows.push({
          id: draft.id,
          inventoryId,
          workOrderId: input.workOrderId,
          workOrderItemId: input.workOrderItemId,
          before: before.toFixed(2),
          cut: draft.cut,
          after: after.toFixed(2),
          coverageCut: null,
          status: "PENDING",
          isFinal: false,
          finalCutSequence: null,
          cost: null,
          freight: null,
          isWaste: draft.isWaste,
          void: false,
          notes: draft.notes ? draft.notes : null,
        })
      }
    }

    if (createRows.length > 0) {
      await tx.flooringCutLog.createMany({ data: createRows })
    }
  }

  for (const update of input.updates) {
    await tx.flooringCutLog.update({
      where: { id: update.id },
      data: {
        ...(update.patch.cut !== undefined ? { cut: update.patch.cut } : {}),
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
