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
import { CutLogExecutionError } from "./errors.js"
import { assertCutLogScope } from "./scope.js"
import type { FinalizeCutLogInput, FinalizeCutLogResult } from "./types.js"

export async function finalizeCutLogUseCase(
  input: FinalizeCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<FinalizeCutLogResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const initial = await c.flooringCutLog.findUnique({
      where: { id: input.cutLogId },
      select: { inventoryId: true },
    })
    if (initial === null) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
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
        inventoryId: true,
        status: true,
        isFinal: true,
        void: true,
        cut: true,
      },
    })
    if (row === null) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Cut log not found",
        status: 404,
        payload: { cutLogId: input.cutLogId },
      })
    }

    assertCutLogScope(input.scope, {
      workOrderId: row.workOrderId,
      inventoryId: row.inventoryId,
    })

    const predicateRow = {
      status: row.status,
      cut: row.cut.toString(),
      isFinal: row.isFinal,
      void: row.void,
    }
    const blocker = getCutLogFinalizabilityBlocker(predicateRow)
    if (blocker !== null || !canFinalizeCutLog(predicateRow)) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_FINALIZE_BLOCKED",
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
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
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
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Cut log not found after stamping",
        status: 404,
        payload: { cutLogId: input.cutLogId },
      })
    }

    return { cutLog }
  })
}
