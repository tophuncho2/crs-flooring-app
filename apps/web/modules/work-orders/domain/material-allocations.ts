import type { WorkOrderMaterialItem } from "@/modules/work-orders/types"

function normalizeNumericValue(value: string) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

export function reconcileMaterialItemDraft(item: WorkOrderMaterialItem): WorkOrderMaterialItem {
  const requiredQuantity = normalizeNumericValue(item.quantity)
  const allocatedQuantity = item.allocations.reduce((total, allocation) => total + normalizeNumericValue(allocation.quantity), 0)
  const materialExpense = item.allocations.reduce(
    (total, allocation) => total + normalizeNumericValue(allocation.quantity) * normalizeNumericValue(allocation.unitCost),
    0,
  )
  const remainingQuantity = Math.max(requiredQuantity - allocatedQuantity, 0)
  const nextAllocationStatus =
    item.allocationStatus === "SHORTAGE" && allocatedQuantity < requiredQuantity
      ? "SHORTAGE"
      : allocatedQuantity <= 0
        ? "NOT_STARTED"
        : allocatedQuantity >= requiredQuantity
          ? "FULLY_ALLOCATED"
          : "PARTIALLY_ALLOCATED"

  return {
    ...item,
    allocatedQuantity,
    remainingQuantity,
    materialExpense,
    allocationStatus: nextAllocationStatus,
    isAllocationDone: nextAllocationStatus === "FULLY_ALLOCATED" || nextAllocationStatus === "SHORTAGE",
    hasAllocationShortage: nextAllocationStatus === "SHORTAGE",
  }
}
