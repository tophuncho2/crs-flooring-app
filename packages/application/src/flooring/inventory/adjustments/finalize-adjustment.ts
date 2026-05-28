import {
  Prisma,
  applyFinalizeAdjustment,
  getAdjustmentById,
  lockInventoryForAdjustment,
  withDatabaseTransaction,
} from "@builders/db"
import {
  assertBeforeAfterInvariant,
  canFinalizeAdjustment,
  getAdjustmentFinalizabilityBlocker,
} from "@builders/domain"
import { InventoryAdjustmentExecutionError } from "./errors.js"
import { assertAdjustmentScope } from "./scope.js"
import type {
  FinalizeAdjustmentInput,
  FinalizeAdjustmentResult,
} from "./types.js"

export async function finalizeAdjustmentUseCase(
  input: FinalizeAdjustmentInput,
  client?: Prisma.TransactionClient,
): Promise<FinalizeAdjustmentResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const initial = await c.flooringInventoryAdjustment.findUnique({
      where: { id: input.adjustmentId },
      select: { inventoryId: true },
    })
    if (initial === null) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        message: "Inventory adjustment not found",
        status: 404,
        payload: { adjustmentId: input.adjustmentId },
      })
    }

    await lockInventoryForAdjustment(c, initial.inventoryId)

    const row = await c.flooringInventoryAdjustment.findUnique({
      where: { id: input.adjustmentId },
      select: {
        id: true,
        adjustmentNumber: true,
        workOrderId: true,
        workOrderItemId: true,
        inventoryId: true,
        status: true,
        isFinal: true,
        quantity: true,
      },
    })
    if (row === null) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        message: "Inventory adjustment not found",
        status: 404,
        payload: { adjustmentId: input.adjustmentId },
      })
    }

    assertAdjustmentScope(input.scope, {
      workOrderId: row.workOrderId,
      inventoryId: row.inventoryId,
    })

    const predicateRow = {
      status: row.status,
      quantity: row.quantity.toString(),
      isFinal: row.isFinal,
    }
    const blocker = getAdjustmentFinalizabilityBlocker(predicateRow)
    if (blocker !== null || !canFinalizeAdjustment(predicateRow)) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_FINALIZE_BLOCKED",
        message: "Inventory adjustment cannot be finalized",
        status: 409,
        payload: {
          adjustmentId: row.id,
          adjustmentNumber: row.adjustmentNumber,
          reason: blocker ?? "ineligible",
        },
      })
    }

    const { stampedRow } = await applyFinalizeAdjustment(c, {
      adjustmentId: input.adjustmentId,
    })
    if (stampedRow === null) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        message: "Inventory adjustment vanished mid-finalize",
        status: 404,
        payload: { adjustmentId: input.adjustmentId },
      })
    }

    assertBeforeAfterInvariant({
      before: stampedRow.before,
      signedDelta: stampedRow.signedDelta,
      after: stampedRow.after,
    })

    const adjustment = await getAdjustmentById(input.adjustmentId, c)
    if (adjustment === null) {
      throw new InventoryAdjustmentExecutionError({
        code: "INVENTORY_ADJUSTMENT_NOT_FOUND",
        message: "Inventory adjustment not found after stamping",
        status: 404,
        payload: { adjustmentId: input.adjustmentId },
      })
    }

    return { adjustment }
  })
}
