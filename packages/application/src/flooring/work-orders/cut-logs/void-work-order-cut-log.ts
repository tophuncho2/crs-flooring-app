import {
  Prisma,
  recomputeAndPersistTotalCutSums,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertCutSumWithinStartingStock,
  buildVoidedCutLogPatch,
  canVoidCutLog,
} from "@builders/domain"
import { WorkOrderCutLogExecutionError } from "./errors.js"
import type { VoidWorkOrderCutLogInput } from "./types.js"

/**
 * Synchronous void use case (no worker, no outbox). Voids a single cut
 * log under the work order's scope.
 *
 * Per locked decision (#1), void is sync + single-row + does NOT flip
 * WOMI status. The whole flow runs inline:
 *   1. Lock the cut log's parent inventory FOR UPDATE (single row —
 *      no need for the multi-inventory locker).
 *   2. Read the cut log under the lock; assert it links to the input
 *      work order and passes `canVoidCutLog`.
 *   3. Apply `buildVoidedCutLogPatch` (sets cut → "0", coverageCut →
 *      null, void → true, status → VOID).
 *   4. Recompute that inventory's `totalCutSum` and assert the invariant.
 *
 * Returns the voided row identifier; UI patches local state.
 */
export async function voidWorkOrderCutLogUseCase(
  input: VoidWorkOrderCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<{ id: string; inventoryId: string }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const existing = await c.flooringCutLog.findUnique({
      where: { id: input.cutLogId },
      select: {
        id: true,
        inventoryId: true,
        workOrderId: true,
        status: true,
        isFinal: true,
        void: true,
      },
    })
    if (!existing) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_NOT_FOUND",
        message: "Cut log not found",
        status: 404,
      })
    }
    if (existing.workOrderId !== input.workOrderId) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH",
        message: "Cut log does not belong to this work order",
        status: 400,
        payload: {
          providedWorkOrderId: input.workOrderId,
          actualWorkOrderId: existing.workOrderId,
        },
      })
    }

    await c.$queryRaw(
      Prisma.sql`SELECT "id" FROM "flooring_inventory" WHERE "id" = ${existing.inventoryId} FOR UPDATE`,
    )

    if (!canVoidCutLog(existing)) {
      throw new WorkOrderCutLogExecutionError({
        code: "WORK_ORDER_CUT_LOG_VOID_NOT_ALLOWED",
        message: "This cut log cannot be voided in its current state",
        status: 409,
        payload: { status: existing.status, isFinal: existing.isFinal, void: existing.void },
      })
    }

    const patch = buildVoidedCutLogPatch()
    await c.flooringCutLog.update({
      where: { id: input.cutLogId },
      data: patch,
      select: { id: true },
    })

    const recomputed = await recomputeAndPersistTotalCutSums(c, [existing.inventoryId])
    const inventory = await c.flooringInventory.findUniqueOrThrow({
      where: { id: existing.inventoryId },
      select: { startingStock: true },
    })
    for (const row of recomputed) {
      assertCutSumWithinStartingStock({
        totalCutSum: row.totalCutSum,
        startingStock: inventory.startingStock.toString(),
      })
    }

    return { id: input.cutLogId, inventoryId: existing.inventoryId }
  })
}
