import type { Prisma } from "@prisma/client"
import {
  buildVoidedCutLogPatch,
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
 * Pending-save patch — only the user-editable PENDING fields (per
 * sweep-2 `CUT_LOG_PENDING_USER_EDITABLE_FIELDS`). `coverageCut` is
 * recomputed by the caller and passed in alongside `cut`.
 */
export type UpdateCutLogPendingInput = {
  cut?: Prisma.Decimal | string | number
  coverageCut?: Prisma.Decimal | string | number | null
  cost?: Prisma.Decimal | string | number | null
  freight?: Prisma.Decimal | string | number | null
  isWaste?: boolean
  notes?: string | null
}

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
  cost?: Prisma.Decimal | string | number | null
  freight?: Prisma.Decimal | string | number | null
}

// Every mutating primitive in this file requires a caller-managed
// transaction (`tx: Prisma.TransactionClient` as the first argument). The
// application use case opens the transaction, locks the parent inventory
// row `FOR UPDATE`, validates domain invariants (using
// `@builders/domain` validators / asserters — those CANNOT be imported
// here per `packages/db/CLAUDE.md` rule 1), applies the cut-log mutation
// via these primitives, and adjusts `inventory.totalCutSum` in the same
// transaction via `updateInventoryTotalCutSum`.

function buildPendingUpdateData(
  input: UpdateCutLogPendingInput,
): Prisma.FlooringCutLogUpdateInput {
  const data: Prisma.FlooringCutLogUpdateInput = {}
  if (input.cut !== undefined) data.cut = input.cut
  if (input.coverageCut !== undefined) data.coverageCut = input.coverageCut
  if (input.cost !== undefined) data.cost = input.cost
  if (input.freight !== undefined) data.freight = input.freight
  if (input.isWaste !== undefined) data.isWaste = input.isWaste
  if (input.notes !== undefined) data.notes = input.notes
  return data
}

export async function updateCutLogPending(
  tx: Prisma.TransactionClient,
  id: string,
  input: UpdateCutLogPendingInput,
): Promise<CutLogRecord> {
  const data = buildPendingUpdateData(input)
  if (Object.keys(data).length > 0) {
    await tx.flooringCutLog.update({
      where: { id },
      data,
      select: { id: true },
    })
  }
  const record = await getCutLogById(id, tx)
  if (!record) {
    throw new Error(`updateCutLogPending: cut log ${id} not found after update`)
  }
  return record
}

/**
 * Apply the void patch to a single cut log. Per sweep 2, the patch erases
 * `cut → "0"`, `coverageCut/cost/freight → null`, sets `void = true` and
 * `status = "VOID"`. Preserves `before`, `after`, `isWaste`, `notes`,
 * `cutLogNumber`, `isFinal`, `finalCutSequence`, `workOrderId`,
 * `workOrderItemId` as historical record (links remain editable for the
 * life of the row via the separate sync use case).
 */
export async function voidCutLogRecord(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<CutLogRecord> {
  const patch = buildVoidedCutLogPatch()
  await tx.flooringCutLog.update({
    where: { id },
    data: {
      cut: patch.cut,
      coverageCut: patch.coverageCut,
      cost: patch.cost,
      freight: patch.freight,
      void: patch.void,
      status: patch.status,
    },
    select: { id: true },
  })
  const record = await getCutLogById(id, tx)
  if (!record) {
    throw new Error(`voidCutLogRecord: cut log ${id} not found after void`)
  }
  return record
}

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
      ...(input.cost !== undefined ? { cost: input.cost } : {}),
      ...(input.freight !== undefined ? { freight: input.freight } : {}),
    },
    select: { id: true },
  })
  const record = await getCutLogById(id, tx)
  if (!record) {
    throw new Error(`finalizeCutLogRecord: cut log ${id} not found after finalize`)
  }
  return record
}

export async function deleteCutLogRecordById(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<void> {
  await tx.flooringCutLog.delete({ where: { id } })
}

/**
 * Sync link-update primitive (cross-sweep extension landed in sweep 4
 * alongside `updateCutLogLinksUseCase`). Per intent doc, the
 * work-order / work-order-item linkage is its own flow that does NOT go
 * through the worker pipeline — it doesn't touch `cut`, `coverageCut`,
 * `cost`, `freight`, or `totalCutSum`, so there's no per-inventory
 * `FOR UPDATE` lock to coordinate with.
 *
 * Input shape: both ids move together OR both are null.
 * `assertCutLogLinkageSymmetry` enforces this in the use case BEFORE
 * calling here (per `packages/db/CLAUDE.md` rule 1 — data layer doesn't
 * import throwing rules). The data primitive trusts its input.
 */
export type UpdateCutLogLinksInput = {
  workOrderId: string | null
  workOrderItemId: string | null
}

export async function updateCutLogLinks(
  tx: Prisma.TransactionClient,
  id: string,
  input: UpdateCutLogLinksInput,
): Promise<CutLogRecord> {
  await tx.flooringCutLog.update({
    where: { id },
    data: {
      workOrder: input.workOrderId
        ? { connect: { id: input.workOrderId } }
        : { disconnect: true },
      workOrderItem: input.workOrderItemId
        ? { connect: { id: input.workOrderItemId } }
        : { disconnect: true },
    },
    select: { id: true },
  })
  const record = await getCutLogById(id, tx)
  if (!record) {
    throw new Error(`updateCutLogLinks: cut log ${id} not found after update`)
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
 * Caller contract (sweep-4 application use case):
 *  - Opens the transaction via `withDatabaseTransaction` and locks the
 *    parent inventory row FOR UPDATE before invoking. Without that lock,
 *    concurrent callers could each pre-read the same row as eligible and
 *    double-queue.
 *  - Validated readiness via `validateCutLogFinalizeBatch` (domain) — every
 *    row in `cutLogIds` should already pass `getCutLogFinalizabilityBlocker`.
 *    The pre-read here is the data-layer's last-line defense, not a
 *    substitute for the domain check.
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

/**
 * Single-row variant for void requests. Voids are always one-at-a-time
 * per the intent doc. Eligibility: not voided, not currently QUEUED, AND
 * (already finalized OR currently PENDING).
 */
export type MarkCutLogForVoidInput = {
  inventoryId: string
  cutLogId: string
}

export type MarkCutLogForVoidResult = {
  marked: boolean
}

export async function markCutLogForVoid(
  tx: Prisma.TransactionClient,
  input: MarkCutLogForVoidInput,
): Promise<MarkCutLogForVoidResult> {
  // Pre-read eligibility in the lock.
  const row = await tx.flooringCutLog.findFirst({
    where: {
      id: input.cutLogId,
      inventoryId: input.inventoryId,
      void: false,
      status: { not: "QUEUED" },
      OR: [{ isFinal: true }, { status: "PENDING" }],
    },
    select: { id: true },
  })
  if (!row) return { marked: false }

  // Conditional update with the same WHERE clause.
  const updated = await tx.flooringCutLog.updateMany({
    where: {
      id: input.cutLogId,
      inventoryId: input.inventoryId,
      void: false,
      status: { not: "QUEUED" },
      OR: [{ isFinal: true }, { status: "PENDING" }],
    },
    data: { status: "QUEUED" },
  })
  return { marked: updated.count > 0 }
}

// ---------------------------------------------------------------------------
// Worker-side apply primitives
// ---------------------------------------------------------------------------

/**
 * Cross-entity batch finalize primitive. Lives in the cut-logs write-repo
 * because it primarily writes to `flooring_cut_log`; the worker-side use
 * case calls `updateInventoryTotalCutSum` separately AFTER this returns
 * (totalCutSum is unchanged by finalize, so this primitive doesn't need
 * to touch the inventory row — but the use case may still re-write it
 * defensively if it has a fresh sum).
 *
 * Caller contract (sweep-4 worker-side use case):
 *  - Opens the transaction via `withDatabaseTransaction` and locks the
 *    parent inventory row FOR UPDATE before invoking.
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

  // Step 3 — deterministic sort by `cutLogNumber ASC` (single key — the
  // column has a unique constraint). Matches `getCutLogsForFinalize`'s
  // orderBy, so this in-memory sort is essentially a defensive re-sort
  // (and will be a no-op when the rows arrive in cutLogNumber order).
  // Sorting by the visible identifier means user-perceived order
  // (rows 4, 7, 9 → seq N, N+1, N+2) aligns with the allocated
  // `finalCutSequence` values.
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

/**
 * Worker-side void apply primitive. Thin wrapper over `voidCutLogRecord`
 * — kept distinct so the application use case has a clear paired naming
 * (`mark*` for the producer side, `apply*` for the worker side).
 */
export async function applyVoidToCutLog(
  tx: Prisma.TransactionClient,
  cutLogId: string,
): Promise<CutLogRecord> {
  return voidCutLogRecord(tx, cutLogId)
}
