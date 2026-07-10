export type AdjustmentInventorySnapshot = {
  inventoryNumber: string | null
  rollPrefix: string | null
  rollNumber: string | null
  dyeLot: string | null
  inventoryNote: string | null
  productId: string
  warehouseId: string
}

export function buildAdjustmentInventorySnapshot(
  inv: AdjustmentInventorySnapshot,
): AdjustmentInventorySnapshot {
  return {
    inventoryNumber: inv.inventoryNumber,
    rollPrefix: inv.rollPrefix,
    rollNumber: inv.rollNumber,
    dyeLot: inv.dyeLot,
    inventoryNote: inv.inventoryNote,
    productId: inv.productId,
    warehouseId: inv.warehouseId,
  }
}
