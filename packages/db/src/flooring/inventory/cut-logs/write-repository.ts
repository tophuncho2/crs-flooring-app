import type { Prisma } from "@prisma/client"
import {
  computeBeforeAfterForFinalize,
  nextFinalCutSequence,
} from "@builders/domain"
import {
  getCutLogById,
  getCutLogsForFinalize,
  getMaxFinalCutSequenceForInventory,
  type CutLogRecord,
} from "./read-repository.js"

/**
 * Worker-only finalize input. Sets `status = FINAL`, `isFinal = true`, and
 * stamps the worker-computed fields atomically. `finalCutSequence` is
 * allocated by the worker via `nextFinalCutSequence(currentMax)` — see
 * `finalizeCutLogBatch` below for the batch-aware caller.
 */
export type FinalizeCutLogRecordInput = {
  before: Prisma.Decimal | string | number
  after: Prisma.Decimal | string | number
  finalCutSequence: number
}

// Every mutating primitive in this file requires a caller-managed
// transaction (`tx: Prisma.TransactionClient` as the first argument). The
// application use case opens the transaction, locks the parent inventory
// row `FOR UPDATE` via `lockInventoryForCutLog` (see `./locks.ts`),
// validates domain invariants, applies the cut-log mutation via these
// primitives, and adjusts `inventory.totalCutSum` in the same transaction
// via `recomputeAndPersistTotalCutSums`.

/**
 * Single-row finalize stamp. Sets `status = FINAL`, `isFinal = true`, and
 * the worker-computed fields. The batch-aware caller `finalizeCutLogBatch`
 * loops over this primitive after pre-computing `before` / `after` /
 * `finalCutSequence` per row.
 */
export async function finalizeCutLogRecord(
  tx: Prisma.TransactionClient,
  id: string,
  input: FinalizeCutLogRecordInput,
): Promise<CutLogRecord> {
  await tx.flooringCutLog.update({
    where: { id },
    data: {
      before: input.before,
      after: input.after,
      finalCutSequence: input.finalCutSequence,
      isFinal: true,
      status: "FINAL",
    },
    select: { id: true },
  })
  const record = await getCutLogById(id, tx)
  if (!record) {
    throw new Error(`finalizeCutLogRecord: cut log ${id} not found after finalize`)
  }
  return record
}

// ---------------------------------------------------------------------------
// Producer-side mark-for-X primitives (mirror staged-inv `markStagedRowsForImport`)
// ---------------------------------------------------------------------------

/**
 * Transactional primitive: flips a batch of cut logs from PENDING (with
 * `isFinal=false && void=false`) to QUEUED so the finalize worker can
 * pick them up.
 *
 * Caller contract (future batch-finalize use case):
 *  - Opens the transaction and locks the parent inventory row FOR UPDATE
 *    before invoking. Without that lock, concurrent callers could each
 *    pre-read the same row as eligible and double-queue.
 *  - Validated readiness via `validateCutLogFinalizeBatch` (domain) — every
 *    row in `cutLogIds` should already pass `getCutLogFinalizabilityBlocker`.
 *
 * Result split:
 *  - `markedRowIds`: rows that were eligible at pre-read AND received the
 *    update.
 *  - `skippedRowIds`: every input ID not in `markedRowIds` — includes rows
 *    in non-PENDING status, finalized rows, voided rows, rows belonging to
 *    a different inventory, and rows that don't exist.
 */
export type MarkCutLogsForFinalizeInput = {
  inventoryId: string
  cutLogIds: string[]
}

export type MarkCutLogsForFinalizeResult = {
  markedRowIds: string[]
  skippedRowIds: string[]
}

export async function markCutLogsForFinalize(
  tx: Prisma.TransactionClient,
  input: MarkCutLogsForFinalizeInput,
): Promise<MarkCutLogsForFinalizeResult> {
  if (input.cutLogIds.length === 0) {
    return { markedRowIds: [], skippedRowIds: [] }
  }
  // Step 1 — pre-read eligible rows (within the transaction's lock scope).
  const eligibleBefore = await tx.flooringCutLog.findMany({
    where: {
      id: { in: input.cutLogIds },
      inventoryId: input.inventoryId,
      status: "PENDING",
      isFinal: false,
      void: false,
    },
    select: { id: true },
  })
  const eligibleIds = new Set(eligibleBefore.map((row) => row.id))

  // Step 2 — conditional bulk update with the same WHERE clause.
  if (eligibleIds.size > 0) {
    await tx.flooringCutLog.updateMany({
      where: {
        id: { in: Array.from(eligibleIds) },
        inventoryId: input.inventoryId,
        status: "PENDING",
        isFinal: false,
        void: false,
      },
      data: { status: "QUEUED" },
    })
  }

  // Step 3 — derive split.
  const markedRowIds = Array.from(eligibleIds)
  const skippedRowIds = input.cutLogIds.filter((id) => !eligibleIds.has(id))
  return { markedRowIds, skippedRowIds }
}

// ---------------------------------------------------------------------------
// Worker-side apply primitives
// ---------------------------------------------------------------------------

/**
 * Cross-entity batch finalize primitive. Lives in the cut-logs write-repo
 * because it primarily writes to `flooring_cut_log`; the worker-side use
 * case calls `recomputeAndPersistTotalCutSums` separately AFTER this
 * returns.
 *
 * Caller contract:
 *  - Opens the transaction and locks the parent inventory row FOR UPDATE
 *    before invoking.
 *  - Validated readiness via `validateCutLogFinalizeBatch` (domain).
 *
 * Execution:
 *  1. Read full records for the cut logs being finalized.
 *  2. Read currentMax via `getMaxFinalCutSequenceForInventory`.
 *  3. Sort the batch by `cutLogNumber ASC` (deterministic; cutLogNumber
 *     has a unique constraint so no tiebreaker is needed; user-facing
 *     identifier order matches `finalCutSequence` allocation order).
 *  4. Loop in sorted order:
 *     - Allocate next finalCutSequence via `nextFinalCutSequence(currentMax)`
 *     - Compute before/after via `computeBeforeAfterForFinalize` using
 *       `priorConsumed = priorConsumedFromExistingFinalCuts + runningConsumed`
 *     - Stamp via `finalizeCutLogRecord`
 *     - Update runningConsumed += row.cut, currentMax = seq
 *  5. Return per-row sequence assignments for outbox / observability.
 */
export type FinalizeCutLogBatchInput = {
  inventoryId: string
  cutLogIds: string[]
  /**
   * The sum of `cut` values for already-finalized non-void cut logs on
   * this inventory. The worker-side use case computes this via
   * `computeTotalCutSum` over the pre-batch snapshot (subtracting any
   * cuts in this batch since they're not yet finalized). Effectively the
   * baseline `priorConsumed` before any row in this batch is processed.
   */
  priorConsumedFromExistingFinalCuts: string | number
  /** Inventory's startingStock — used by computeBeforeAfterForFinalize. */
  startingStock: string | number
}

export type FinalizeCutLogBatchResult = {
  finalizedRowIds: string[]
  finalCutSequenceByRowId: Record<string, number>
}

export async function finalizeCutLogBatch(
  tx: Prisma.TransactionClient,
  input: FinalizeCutLogBatchInput,
): Promise<FinalizeCutLogBatchResult> {
  if (input.cutLogIds.length === 0) {
    return { finalizedRowIds: [], finalCutSequenceByRowId: {} }
  }

  // Step 1 — read full records for the rows being finalized.
  const rows = await getCutLogsForFinalize(tx, {
    inventoryId: input.inventoryId,
    cutLogIds: input.cutLogIds,
  })

  // Step 2 — read currentMax under the lock.
  let currentMax = await getMaxFinalCutSequenceForInventory(tx, input.inventoryId)

  // Step 3 — deterministic sort by `cutLogNumber ASC`. Matches
  // `getCutLogsForFinalize`'s orderBy, so this in-memory sort is
  // essentially a defensive re-sort.
  const sorted = [...rows].sort((a, b) => {
    if (a.cutLogNumber < b.cutLogNumber) return -1
    if (a.cutLogNumber > b.cutLogNumber) return 1
    return 0
  })

  // Step 4 — loop and stamp.
  let runningConsumed = 0
  const finalCutSequenceByRowId: Record<string, number> = {}
  const finalizedRowIds: string[] = []

  for (const row of sorted) {
    const seq = nextFinalCutSequence(currentMax)
    const priorConsumed =
      Number(input.priorConsumedFromExistingFinalCuts) + runningConsumed
    const { before, after } = computeBeforeAfterForFinalize({
      startingStock: input.startingStock,
      priorConsumed,
      cut: row.cut,
    })
    await finalizeCutLogRecord(tx, row.id, {
      before,
      after,
      finalCutSequence: seq,
    })
    finalCutSequenceByRowId[row.id] = seq
    finalizedRowIds.push(row.id)
    runningConsumed += Number(row.cut)
    currentMax = seq
  }

  return { finalizedRowIds, finalCutSequenceByRowId }
}
