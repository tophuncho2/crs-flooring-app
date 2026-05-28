import { InventoryAdjustmentDomainError } from "../errors.js"

export function nextFinalSequence(currentMax: number | null): number {
  if (currentMax === null) return 1
  if (!Number.isFinite(currentMax) || currentMax < 0 || !Number.isInteger(currentMax)) {
    throw new InventoryAdjustmentDomainError("INVENTORY_ADJUSTMENT_FINAL_SEQUENCE_INVALID", {
      currentMax,
    })
  }
  return currentMax + 1
}
