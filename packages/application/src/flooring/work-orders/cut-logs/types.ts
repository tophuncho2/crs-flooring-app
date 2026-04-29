export type RequestedBy = {
  userId: string
  userEmail: string
}

export type WorkOrderCutLogPendingDraft = {
  tempId: string
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
}

export type WorkOrderCutLogPendingUpdate = {
  id: string
  expectedUpdatedAt: string
  patch: {
    cut?: string
    isWaste?: boolean
    notes?: string
  }
}

export type WorkOrderCutLogPendingDelete = {
  id: string
  expectedUpdatedAt: string
}

export type WorkOrderCutLogPendingDiff = {
  added: WorkOrderCutLogPendingDraft[]
  modified: WorkOrderCutLogPendingUpdate[]
  deleted: WorkOrderCutLogPendingDelete[]
}

export type SaveWorkOrderItemPendingCutLogDiffInput = {
  workOrderId: string
  workOrderItemId: string
  requestKey: string
  diff: WorkOrderCutLogPendingDiff
  requestedBy: RequestedBy
}

export type SaveWorkOrderItemPendingCutLogDiffResult = {
  outboxEventId: string
  wasDuplicate: boolean
  tempIdMap: Record<string, string>
}

export type FinalizeWorkOrderCutLogBatchInput = {
  workOrderId: string
  requestKey: string
  cutLogIds: string[]
  requestedBy: RequestedBy
}

export type FinalizeWorkOrderCutLogBatchResult = {
  outboxEventId: string
  wasDuplicate: boolean
  touchedWorkOrderItemIds: string[]
}

export type VoidWorkOrderCutLogInput = {
  workOrderId: string
  cutLogId: string
}
