import {
  Prisma,
  applyVoidToCutLog,
  lockInventoryForCutLog,
  recomputeAndPersistTotalCutSums,
  withDatabaseTransaction,
} from "@builders/db"
import { assertCutSumWithinStartingStock, canVoidCutLog } from "@builders/domain"
import { CutLogExecutionError } from "./errors.js"
import { assertCutLogScope } from "./scope.js"
import type { CutLogMutationResult, VoidCutLogInput } from "./types.js"

/**
 * Synchronous void use case. Voids a single cut log under the scope
 * passed by the route (WO or inventory). Single TX:
 *   1. Read the cut log's identity + lifecycle fields.
 *   2. Scope assertion.
 *   3. Lock the parent inventory FOR UPDATE (canonical
 *      `lockInventoryForCutLog`).
 *   4. `canVoidCutLog` lifecycle gate — allowed on PENDING or FINAL,
 *      rejected on QUEUED or already-VOID.
 *   5. `applyVoidToCutLog` data primitive applies the canonical void
 *      patch (zeros `cut`, nulls `coverageCut`, sets `status: VOID` +
 *      `void: true`, clears both link columns, clears `location`).
 *   6. Recompute `totalCutSum` + invariant.
 *
 * No outbox, no worker, no replay tolerance. WOMI status is not
 * consulted — the inventory row lock is the sole correctness mechanism.
 * Voiding is the only mutation allowed against a finalized cut log;
 * pending cut logs are deleted via the delete use case instead.
 */
export async function voidCutLogUseCase(
  input: VoidCutLogInput,
  client?: Prisma.TransactionClient,
): Promise<CutLogMutationResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    // 1. Read identity + lifecycle (pre-lock; safe — the read is repeated
    // under the lock by `canVoidCutLog`'s inputs via the void primitive).
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
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Cut log not found",
        status: 404,
      })
    }

    // 2. Scope assertion.
    assertCutLogScope(input.scope, {
      workOrderId: existing.workOrderId,
      inventoryId: existing.inventoryId,
    })

    // 3. Lock parent inventory.
    await lockInventoryForCutLog(c, existing.inventoryId)

    // 4. Lifecycle gate.
    if (!canVoidCutLog(existing)) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_VOID_NOT_ALLOWED",
        message: "This cut log cannot be voided in its current state",
        status: 409,
        payload: {
          status: existing.status,
          isFinal: existing.isFinal,
          void: existing.void,
        },
      })
    }

    // 5. Apply the void patch via the data primitive.
    const cutLog = await applyVoidToCutLog(c, input.cutLogId)

    // 6. Recompute + invariant.
    const recomputed = await recomputeAndPersistTotalCutSums(c, [existing.inventoryId])
    const result = recomputed[0]
    if (!result) {
      // Defensive — recompute always returns a row for an inventory id we passed.
      throw new CutLogExecutionError({
        code: "CUT_LOG_NOT_FOUND",
        message: "Parent inventory disappeared mid-void",
        status: 500,
        payload: { inventoryId: existing.inventoryId },
      })
    }
    const inventory = await c.flooringInventory.findUniqueOrThrow({
      where: { id: existing.inventoryId },
      select: { startingStock: true },
    })
    assertCutSumWithinStartingStock({
      totalCutSum: result.totalCutSum,
      startingStock: inventory.startingStock.toString(),
    })

    return {
      cutLog,
      inventoryId: result.inventoryId,
      totalCutSum: result.totalCutSum,
    }
  })
}
