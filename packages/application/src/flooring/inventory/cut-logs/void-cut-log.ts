import {
  Prisma,
  applyVoidToCutLog,
  getCutLogForVoid,
  getInventoryParentContextForCutLogs,
  listCutLogsByInventoryId,
  updateInventoryTotalCutSum,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertCutSumWithinStartingStock,
  computeTotalCutSum,
  type VoidCutLogPayload,
} from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"
import type { VoidCutLogResult } from "./types.js"

/**
 * Worker-side consumer for `flooring.cut-log.void`.
 *
 * What this does:
 *  1. Locks the parent inventory FOR UPDATE.
 *  2. Re-fetches the row + defensively re-runs `validateCutLogVoidRequest`.
 *  3. Applies the void patch via `applyVoidToCutLog` (data primitive
 *     calls `buildVoidedCutLogPatch` — `cut→"0"`,
 *     `coverageCut/cost/freight→null`, `void=true`, `status=VOID`).
 *  4. Recomputes `totalCutSum` from all remaining non-void cuts and
 *     persists via `updateInventoryTotalCutSum`. The assert is a
 *     belt-and-suspenders check (void strictly DECREASES the sum, so
 *     it always passes — but the assertion is cheap).
 */
export async function voidCutLogUseCase(
  payload: VoidCutLogPayload,
  client?: Prisma.TransactionClient,
): Promise<VoidCutLogResult> {
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

    const row = await getCutLogForVoid(c, payload.cutLogId)
    if (!row) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Cut log not found.",
        status: 404,
      })
    }

    // Drift check: the producer flipped the row to QUEUED, so the worker
    // expects exactly that state. We do NOT re-run `validateCutLogVoidRequest`
    // — that validator rejects QUEUED rows (it's shaped for the producer's
    // pre-mark check). Mirrors the same shape as the finalize consumer.
    if (row.status !== "QUEUED" || row.void) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_PRECONDITION_FAILED",
        message:
          "Cut log drifted out of QUEUED state before void could apply. Re-mark and try again.",
        status: 409,
        payload: { rowId: row.id, status: row.status, void: row.void },
      })
    }

    const voidedRow = await applyVoidToCutLog(c, payload.cutLogId)

    const remaining = await listCutLogsByInventoryId(payload.inventoryId, c)
    const newTotalCutSum = computeTotalCutSum(
      remaining.map((row) => ({ cut: row.cut, void: row.void })),
    )

    assertCutSumWithinStartingStock({
      totalCutSum: newTotalCutSum,
      startingStock: parent.startingStock,
    })

    await updateInventoryTotalCutSum(
      payload.inventoryId,
      { totalCutSum: newTotalCutSum },
      c,
    )

    return { row: voidedRow, newTotalCutSum }
  })
}
