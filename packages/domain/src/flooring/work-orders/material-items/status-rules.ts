import { WorkOrderDomainError } from "../errors.js"
import type { WorkOrderItemStatus } from "./types.js"

const ALLOWED_TRANSITIONS: Record<WorkOrderItemStatus, ReadonlySet<WorkOrderItemStatus>> = {
  IDLE: new Set<WorkOrderItemStatus>(["IDLE", "SAVING_CUTS", "FINALIZING"]),
  SAVING_CUTS: new Set<WorkOrderItemStatus>(["IDLE", "FAILED"]),
  FINALIZING: new Set<WorkOrderItemStatus>(["IDLE", "FAILED"]),
  FAILED: new Set<WorkOrderItemStatus>(["SAVING_CUTS", "FINALIZING", "IDLE"]),
}

export function isWorkOrderItemStatusTransitionAllowed(input: {
  current: WorkOrderItemStatus
  next: WorkOrderItemStatus
}): boolean {
  return ALLOWED_TRANSITIONS[input.current].has(input.next)
}

export function assertWorkOrderItemStatusTransition(input: {
  current: WorkOrderItemStatus
  next: WorkOrderItemStatus
}): void {
  if (!isWorkOrderItemStatusTransitionAllowed(input)) {
    throw new WorkOrderDomainError("WORK_ORDER_ITEM_INVALID_STATUS_TRANSITION", {
      current: input.current,
      next: input.next,
    })
  }
}
