export type InventoryDependentCounts = {
  inventoryAdjustmentsCount: number
}

export function isInventoryDeleteBlocked(counts: InventoryDependentCounts): boolean {
  return counts.inventoryAdjustmentsCount > 0
}

export function buildInventoryDeleteBlockedMessage(counts: InventoryDependentCounts): string {
  if (counts.inventoryAdjustmentsCount <= 0)
    return "Inventory row has no linked inventory adjustments"
  const n = counts.inventoryAdjustmentsCount
  return `Inventory cannot be deleted while ${n} inventory adjustment${n === 1 ? "" : "s"} reference${n === 1 ? "s" : ""} it`
}
