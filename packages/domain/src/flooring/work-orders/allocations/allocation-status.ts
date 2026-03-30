import { toAllocationNumber } from "./shared.js"

export type WorkOrderMaterialAllocationStatus =
  | "NOT_STARTED"
  | "PARTIALLY_ALLOCATED"
  | "FULLY_ALLOCATED"
  | "SHORTAGE"

export type WorkOrderAllocationWorkflowSummary = {
  isDone: boolean
  hasPendingRun: boolean
}

export function determineWorkOrderMaterialAllocationStatus(input: {
  requiredQuantity: string | number
  allocatedQuantity: string | number
  hasPendingAllocationRun?: boolean
  hasEligibleInventoryRemaining?: boolean
}): WorkOrderMaterialAllocationStatus {
  const requiredQuantity = toAllocationNumber(input.requiredQuantity)
  const allocatedQuantity = toAllocationNumber(input.allocatedQuantity)
  const remainingQuantity = Math.max(0, requiredQuantity - allocatedQuantity)

  if (remainingQuantity <= 0.0001) {
    return "FULLY_ALLOCATED"
  }

  if (input.hasPendingAllocationRun) {
    return allocatedQuantity > 0 ? "PARTIALLY_ALLOCATED" : "NOT_STARTED"
  }

  if (input.hasEligibleInventoryRemaining === false) {
    return "SHORTAGE"
  }

  return allocatedQuantity > 0 ? "PARTIALLY_ALLOCATED" : "NOT_STARTED"
}

export function buildWorkOrderAllocationWorkflowSummary(input: {
  itemStatuses: WorkOrderMaterialAllocationStatus[]
  hasPendingRun: boolean
}): WorkOrderAllocationWorkflowSummary {
  return {
    hasPendingRun: input.hasPendingRun,
    isDone:
      !input.hasPendingRun &&
      input.itemStatuses.every((status) => status === "FULLY_ALLOCATED" || status === "SHORTAGE"),
  }
}

export function derivePersistedWorkOrderItemState(status: WorkOrderMaterialAllocationStatus) {
  return {
    allocationStatus: status,
    changeOrderStatus: status === "SHORTAGE" ? "SHORTAGE" : "SUFFICIENT",
  } as const
}
