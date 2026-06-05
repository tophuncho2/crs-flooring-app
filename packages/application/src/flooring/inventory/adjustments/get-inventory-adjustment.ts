import { getEnrichedInventoryAdjustmentById } from "@builders/db"
import type { EnrichedInventoryAdjustmentRow } from "@builders/domain"

export type GetInventoryAdjustmentInput = {
  inventoryId: string
  adjustmentId: string
}

/**
 * Read a single enriched adjustment scoped to its parent inventory. Powers
 * deep-linking into a specific adjustment from the adjustments ledger (the row
 * may not be on the inventory record view's first loaded page). Returns null
 * when the adjustment doesn't exist or doesn't belong to the given inventory —
 * the route surfaces that as a 404.
 */
export async function getInventoryAdjustmentUseCase(
  input: GetInventoryAdjustmentInput,
): Promise<EnrichedInventoryAdjustmentRow | null> {
  const adjustment = await getEnrichedInventoryAdjustmentById(input.adjustmentId)
  if (!adjustment) return null
  if (adjustment.inventoryId !== input.inventoryId) return null
  return adjustment
}
