import {
  Prisma,
  applyFinalizeCutLog,
  getCutLogById,
  lockInventoryForCutLog,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertBeforeCutAfterInvariant,
  canFinalizeCutLog,
  getCutLogFinalizabilityBlocker,
} from "@builders/domain"
import { WorkOrderCutLogExecutionError } from "./errors.js"
import type {
  FinalizeWorkOrderCutLogInput,
  FinalizeWorkOrderCutLogResult,
} from "./types.js"

/**
 * Synchronous single-row finalize. In one TX:
 *   1. Read the row's `inventoryId`.
 *   2. Lock the parent inventory FOR UPDATE.
 *   3. Re-read the row under the lock and run the finalizability predicate.
 *   4. Stamp `before` / `after` / `finalCutSequence` and flip status to FINAL
 *      via the data-layer `applyFinalizeCutLog`.
 *   5. Defensively re-assert the `before − cut === after` invariant.
 *   6. Re-read the normalized row so the response carries the canonical
 *      `CutLogRow` shape (matching create/update return).
 *
 * No outbox, no worker, no replay tolerance. Errors are terminal HTTP
 * responses; a double-click after the row is FINAL gets a deterministic
 * 409 from `canFinalizeCutLog`. WOMI status is not consulted or mutated —
 * the inventory row lock is the sole correctness mechanism.
 */
export async function finalizeWorkOrderCutLogUseCase(
  input: FinalizeWorkOrderCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<FinalizeWorkOrderCutLogResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const initial = await c.flooringCutLog.findUnique({
      where: { id: input.cutLogId },
      select: { inventoryId: true },
    })
    if (initial === null) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
        message: "Cut log not found",
        status: 404,
        payload: { cutLogId: input.cutLogId },
      })
    }

    await lockInventoryForCutLog(c, initial.inventoryId)

    const row = await c.flooringCutLog.findUnique({
      where: { id: input.cutLogId },
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
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
        message: "Cut log not found",
        status: 404,
        payload: { cutLogId: input.cutLogId },
      })
    }

    if (row.workOrderId !== input.workOrderId || row.workOrderItemId === null) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH",
        message: "Cut log does not belong to this work order",
        status: 400,
        payload: {
          cutLogId: row.id,
          providedWorkOrderId: input.workOrderId,
          actualWorkOrderId: row.workOrderId,
        },
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
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_FINALIZE_BLOCKED",
        message: "Cut log cannot be finalized",
        status: 409,
        payload: {
          cutLogId: row.id,
          cutLogNumber: row.cutLogNumber,
          reason: blocker ?? "ineligible",
        },
      })
    }

    const { stampedRow } = await applyFinalizeCutLog(c, {
      cutLogId: input.cutLogId,
    })
    if (stampedRow === null) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
        message: "Cut log vanished mid-finalize",
        status: 404,
        payload: { cutLogId: input.cutLogId },
      })
    }

    assertBeforeCutAfterInvariant({
      before: stampedRow.before,
      cut: stampedRow.cut,
      after: stampedRow.after,
    })

    const cutLog = await getCutLogById(input.cutLogId, c)
    if (cutLog === null) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
        message: "Cut log not found after stamping",
        status: 404,
        payload: { cutLogId: input.cutLogId },
      })
    }

    return { cutLog }
  })
}
