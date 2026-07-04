import { InventoryAdjustmentExecutionError } from "./errors.js"
import type { AdjustmentMutationScope } from "./types.js"

export function assertAdjustmentScope(
  scope: AdjustmentMutationScope,
  row: { workOrderId: string | null; inventoryId: string },
): void {
  if (scope.kind === "work-order") {
    if (row.workOrderId !== scope.workOrderId) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_SCOPE_MISMATCH",
        message: "Inventory adjustment does not belong to this work order",
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
    throw new InventoryAdjustmentExecutionError({
      code: "INVENTORY_ADJUSTMENT_SCOPE_MISMATCH",
      message: "Inventory adjustment does not belong to this inventory",
      status: 400,
      payload: {
        providedInventoryId: scope.inventoryId,
        actualInventoryId: row.inventoryId,
      },
    })
  }
}
