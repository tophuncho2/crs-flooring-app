import { WorkOrderDomainError } from "./errors.js"

export function isWorkOrderWarehouseChangeBlocked(input: {
  currentWarehouseId: string | null
  nextWarehouseId: string | null
  hasLinkedCutLogs: boolean
}): boolean {
  if (input.currentWarehouseId === input.nextWarehouseId) return false
  return input.hasLinkedCutLogs
}

export function assertWorkOrderWarehouseChangeAllowed(input: {
  currentWarehouseId: string | null
  nextWarehouseId: string | null
  hasLinkedCutLogs: boolean
}): void {
  if (isWorkOrderWarehouseChangeBlocked(input)) {
    throw new WorkOrderDomainError("WORK_ORDER_WAREHOUSE_LOCKED", {
      currentWarehouseId: input.currentWarehouseId,
      nextWarehouseId: input.nextWarehouseId,
    })
  }
}
