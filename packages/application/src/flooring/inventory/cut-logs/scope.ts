import { CutLogExecutionError } from "./errors.js"
import type { CutLogMutationScope } from "./types.js"

/**
 * Asserts the cut log row's identity matches the route-derived scope.
 * Route handlers stamp `scope` from `params.id` — WO routes pass
 * `{ kind: "work-order", workOrderId }`, inv routes pass
 * `{ kind: "inventory", inventoryId }`. The use case calls this AFTER
 * loading the row, BEFORE taking the lock — a mismatch is a 400 and
 * never proceeds to mutate state.
 *
 * Replaces the prior WO-only `WORK_ORDER_CUT_LOG_LINKAGE_MISMATCH`
 * check that compared `existing.workOrderId` against `input.workOrderId`.
 *
 * Not exported from the package barrel — internal helper for the four
 * scope-aware use cases.
 */
export function assertCutLogScope(
  scope: CutLogMutationScope,
  row: { workOrderId: string | null; inventoryId: string },
): void {
  if (scope.kind === "work-order") {
    if (row.workOrderId !== scope.workOrderId) {
      throw new CutLogExecutionError({
        code: "CUT_LOG_SCOPE_MISMATCH",
        message: "Cut log does not belong to this work order",
        status: 400,
        payload: {
          providedWorkOrderId: scope.workOrderId,
          actualWorkOrderId: row.workOrderId,
        },
      })
    }
    return
  }
  if (row.inventoryId !== scope.inventoryId) {
    throw new CutLogExecutionError({
      code: "CUT_LOG_SCOPE_MISMATCH",
      message: "Cut log does not belong to this inventory",
      status: 400,
      payload: {
        providedInventoryId: scope.inventoryId,
        actualInventoryId: row.inventoryId,
      },
    })
  }
}
