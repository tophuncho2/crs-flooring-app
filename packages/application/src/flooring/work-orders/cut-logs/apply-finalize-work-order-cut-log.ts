import {
  Prisma,
  applyFinalizeWorkOrderCutLog,
  lockInventoryForCutLog,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertBeforeCutAfterInvariant,
  canFinalizeCutLog,
  getCutLogFinalizabilityBlocker,
  type FinalizeWorkOrderCutLogPayload,
} from "@builders/domain"
import { WorkOrderCutLogExecutionError } from "./errors.js"

export type ApplyFinalizeWorkOrderCutLogResult = {
  cutLogId: string
  touchedInventoryId: string | null
  alreadyResolved: boolean
}

/**
 * Consumer (called by the BullMQ worker processor) for the single-row
 * finalize flow.
 *
 * Inside one TX:
 *   1. Read the cut log row to derive its inventory id.
 *      - Row missing → no-op success (`alreadyResolved: true`). The row
 *        was deleted between outbox enqueue and worker pickup; nothing
 *        to do, no compensating writes.
 *   2. `lockInventoryForCutLog` on that inventory.
 *   3. Re-read the row under the lock and re-run the finalizability
 *      predicate.
 *      - Row missing now → no-op success.
 *      - Already FINAL or VOID → no-op success. The row reached its
 *        terminal state by some other means (concurrent finalize, void,
 *        etc.); double-clicks and retries don't surface as failures.
 *      - Linkage drift → terminal `WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH`.
 *      - Other ineligibility (e.g. cut value invalidated) → terminal
 *        `WORK_ORDER_CUT_LOG_FINALIZE_BLOCKED`.
 *   4. `applyFinalizeWorkOrderCutLog` stamps `before` / `after` /
 *      `finalCutSequence` and flips status to FINAL.
 *   5. `assertBeforeCutAfterInvariant` defensively re-asserts the
 *      arithmetic on the stamped row.
 *
 * `recomputeAndPersistTotalCutSums` and `assertCutSumWithinStartingStock`
 * are intentionally NOT called here — `cut` doesn't change at finalize
 * time, so `totalCutSum` is identical pre/post and the invariant is
 * automatically preserved.
 *
 * Failures roll back the TX. The cut log row stays PENDING; the user
 * can retry. WOMI status is not touched.
 */
export async function applyFinalizeWorkOrderCutLogUseCase(
  payload: FinalizeWorkOrderCutLogPayload,
  client?: Prisma.TransactionClient,
): Promise<ApplyFinalizeWorkOrderCutLogResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const initial = await c.flooringCutLog.findUnique({
      where: { id: payload.cutLogId },
      select: { inventoryId: true },
    })
    if (initial === null) {
      return {
        cutLogId: payload.cutLogId,
        touchedInventoryId: null,
        alreadyResolved: true,
      }
    }

    await lockInventoryForCutLog(c, initial.inventoryId)

    const row = await c.flooringCutLog.findUnique({
      where: { id: payload.cutLogId },
      select: {
        id: true,
        cutLogNumber: true,
        workOrderId: true,
        workOrderItemId: true,
        status: true,
        isFinal: true,
        void: true,
        cut: true,
      },
    })
    if (row === null) {
      return {
        cutLogId: payload.cutLogId,
        touchedInventoryId: null,
        alreadyResolved: true,
      }
    }

    if (row.workOrderId !== payload.workOrderId || row.workOrderItemId === null) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH",
        message: "Cut log linkage drifted before finalize ran",
        status: 409,
        payload: { cutLogId: row.id },
      })
    }

    const predicateRow = {
      status: row.status,
      cut: row.cut.toString(),
      isFinal: row.isFinal,
      void: row.void,
    }
    const blocker = getCutLogFinalizabilityBlocker(predicateRow)
    if (blocker !== null || !canFinalizeCutLog(predicateRow)) {
      // Already-FINAL / already-VOID is the common "row reached its
      // terminal state by some other means" case (double-click, replay,
      // concurrent void). Treat as no-op success.
      if (row.isFinal || row.void) {
        return {
          cutLogId: payload.cutLogId,
          touchedInventoryId: initial.inventoryId,
          alreadyResolved: true,
        }
      }
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_FINALIZE_BLOCKED",
        message: "Cut log can no longer be finalized",
        status: 409,
        payload: { cutLogId: row.id, reason: blocker ?? "ineligible" },
      })
    }

    const { stampedRow } = await applyFinalizeWorkOrderCutLog(c, {
      cutLogId: payload.cutLogId,
    })
    if (stampedRow === null) {
      // Row vanished between the lock and the apply — same no-op path.
      return {
        cutLogId: payload.cutLogId,
        touchedInventoryId: initial.inventoryId,
        alreadyResolved: true,
      }
    }

    assertBeforeCutAfterInvariant({
      before: stampedRow.before,
      cut: stampedRow.cut,
      after: stampedRow.after,
    })

    return {
      cutLogId: payload.cutLogId,
      touchedInventoryId: initial.inventoryId,
      alreadyResolved: false,
    }
  })
}
