import { getAdjustmentNeighbors } from "@builders/db"
import type { InventoryAdjustmentNeighbors } from "@builders/domain"

export type GetAdjustmentNeighborsInput = {
  inventoryId: string
  adjustmentId: string
}

/**
 * Prev/next adjustment neighbors within one parent inventory's ledger, powering
 * the record-view Adjustments-section stepper. Scoped to the adjustment's own
 * `inventoryId` and walked in ledger order (`createdAt DESC, id DESC`), so the
 * stepper crosses page boundaries. Returns null when the adjustment doesn't
 * exist or doesn't belong to the given inventory — the route surfaces that as a
 * 404 (mirrors `getInventoryAdjustmentUseCase`).
 */
export async function getAdjustmentNeighborsUseCase(
  input: GetAdjustmentNeighborsInput,
): Promise<InventoryAdjustmentNeighbors | null> {
  const result = await getAdjustmentNeighbors(input.adjustmentId)
  if (!result) return null
  if (result.inventoryId !== input.inventoryId) return null
  return {
    previousAdjustment: result.previousAdjustment,
    nextAdjustment: result.nextAdjustment,
  }
}
