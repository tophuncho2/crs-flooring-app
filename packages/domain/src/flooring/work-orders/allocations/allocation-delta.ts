import { determineWorkOrderMaterialAllocationStatus, type WorkOrderMaterialAllocationStatus } from "./allocation-status.js"
import { toAllocationNumber } from "./shared.js"

export type WorkOrderItemAllocationInput = {
  quantity: string | number
  unitCost: string | number
}

export type WorkOrderItemAllocationSummary = {
  allocatedQuantity: number
  remainingQuantity: number
  materialExpense: number
  hasAllocationShortage: boolean
  allocationStatus: WorkOrderMaterialAllocationStatus
  isDone: boolean
}

export function calculateInventoryPricePerUnit(input: {
  stockCount: string | number | null | undefined
  cost: string | number | null | undefined
  freight: string | number | null | undefined
}) {
  const stockCount = toAllocationNumber(input.stockCount)
  if (stockCount <= 0) {
    return 0
  }

  return (toAllocationNumber(input.cost) + toAllocationNumber(input.freight)) / stockCount
}

export function calculateAllocationRowTotal(input: WorkOrderItemAllocationInput) {
  return toAllocationNumber(input.quantity) * toAllocationNumber(input.unitCost)
}

export function buildWorkOrderItemAllocationSummary(input: {
  requiredQuantity: string | number
  allocations: WorkOrderItemAllocationInput[]
  hasPendingAllocationRun?: boolean
  hasEligibleInventoryRemaining?: boolean
}): WorkOrderItemAllocationSummary {
  const allocatedQuantity = input.allocations.reduce((total, allocation) => total + toAllocationNumber(allocation.quantity), 0)
  const requiredQuantity = toAllocationNumber(input.requiredQuantity)
  const remainingQuantity = Math.max(0, requiredQuantity - allocatedQuantity)
  const materialExpense = input.allocations.reduce((total, allocation) => total + calculateAllocationRowTotal(allocation), 0)
  const allocationStatus = determineWorkOrderMaterialAllocationStatus({
    requiredQuantity,
    allocatedQuantity,
    hasPendingAllocationRun: input.hasPendingAllocationRun,
    hasEligibleInventoryRemaining: input.hasEligibleInventoryRemaining,
  })
  const isDone = !input.hasPendingAllocationRun && (allocationStatus === "FULLY_ALLOCATED" || allocationStatus === "SHORTAGE")

  return {
    allocatedQuantity,
    remainingQuantity,
    materialExpense,
    hasAllocationShortage: allocationStatus === "SHORTAGE",
    allocationStatus,
    isDone,
  }
}
