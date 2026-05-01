export type RequestedBy = {
  userId: string
  userEmail: string
}

// Per-row sync pending-cut-log mutation inputs are owned by the domain
// layer (single source of truth). Re-exported here so consumers that
// import from `@builders/application` (notably the API-route validators)
// don't need to add a domain import.
export type {
  CreatePendingCutLogInput,
  UpdatePendingCutLogInput,
  UpdatePendingCutLogPatch,
  DeletePendingCutLogInput,
} from "@builders/domain"

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
