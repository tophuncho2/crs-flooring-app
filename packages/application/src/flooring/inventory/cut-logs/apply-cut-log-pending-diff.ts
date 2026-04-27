import {
  Prisma,
  applyCutLogPendingSaveDiff,
  getInventoryParentContextForCutLogs,
  listCutLogsForPendingSaveDiff,
  updateInventoryTotalCutSum,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertCutSumWithinStartingStock,
  computeTotalCutSum,
  describeCutLogDiffIssues,
  validateCutLogsDiff,
  type PendingSaveCutLogBatchPayload,
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"
import type { ApplyCutLogPendingDiffResult } from "./types.js"

/**
 * Worker-side consumer for `flooring.cut-log.pending-save`.
 *
 * What this does:
 *  1. Locks the parent inventory FOR UPDATE.
 *  2. Snapshots existing cut logs + parent context (defensively re-runs
 *     `validateCutLogsDiff` against the fresh snapshot — catches drift
 *     since the producer's optimistic check).
 *  3. Applies the diff via `applyCutLogPendingSaveDiff` (createMany +
 *     per-row update + deleteMany).
 *  4. Recomputes `totalCutSum` over the post-diff non-void cut state,
 *     asserts it's still within starting stock (single-writer rule
 *     defense), persists via `updateInventoryTotalCutSum`.
 *
 * Cut-log `status` is unchanged (PENDING throughout) — pending-save
 * mutates data, not lifecycle.
 */
export async function applyCutLogPendingDiffUseCase(
  payload: PendingSaveCutLogBatchPayload,
  client?: Prisma.TransactionClient,
): Promise<ApplyCutLogPendingDiffResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    await c.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ${payload.inventoryId} FOR UPDATE`,
    )

    const parent = await getInventoryParentContextForCutLogs(c, payload.inventoryId)
    if (!parent) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_PARENT_NOT_FOUND",
        message: "Inventory not found.",
        status: 404,
      })
    }

    const existing = await listCutLogsForPendingSaveDiff(c, payload.inventoryId)

    // Defensive re-validation under the lock. The producer already ran
    // this once, but other writers may have committed since.
    const issues = validateCutLogsDiff(
      payload.diff,
      { existing },
      parent,
    )
    if (issues.length > 0) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_DIFF_VALIDATION_FAILED",
        message: describeCutLogDiffIssues(issues),
        status: 409,
        payload: { issues },
      })
    }

    const result = await applyCutLogPendingSaveDiff(c, {
      inventoryId: payload.inventoryId,
      added: payload.diff.added.map((draft) => ({
        // Both `id` (producer-stamped UUID) and `tempId` (UI-supplied
        // marker) ride in the payload — see `pending-save-cut-log-batch.ts`.
        // We use `draft.id` for the actual insert so retries are
        // idempotent.
        id: draft.id,
        tempId: draft.tempId,
        cut: draft.cut,
        coverageCut: null,
        cost: draft.cost,
        freight: draft.freight,
        isWaste: draft.isWaste,
        notes: draft.notes,
      })),
      modified: payload.diff.modified.map((m) => ({
        id: m.id,
        patch: {
          cut: m.patch.cut,
          cost: m.patch.cost,
          freight: m.patch.freight,
          isWaste: m.patch.isWaste,
          notes: m.patch.notes,
        },
      })),
      deleted: payload.diff.deleted.map((d) => ({ id: d.id })),
    })

    // Recompute totalCutSum from post-diff state. The data primitive
    // returned the full normalized rows for the inventory.
    const newTotalCutSum = computeTotalCutSum(
      result.rows.map((row) => ({ cut: row.cut, void: row.void })),
    )

    // Single-writer-rule defense. The diff validator should have caught
    // any breach above, but this guard fires if a downstream invariant
    // ever drifts (e.g. schema starting stock changed under us).
    assertCutSumWithinStartingStock({
      totalCutSum: newTotalCutSum,
      startingStock: parent.startingStock,
    })

    await updateInventoryTotalCutSum(
      payload.inventoryId,
      { totalCutSum: newTotalCutSum },
      c,
    )

    return { rows: result.rows, newTotalCutSum }
  })
}
