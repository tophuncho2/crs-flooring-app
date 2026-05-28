import { CutLogExecutionError } from "./errors.js"
import type { CutLogMutationScope } from "./types.js"

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
