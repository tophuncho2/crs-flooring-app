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

// Diff types from the prior async pending-save flow have been removed
// (sweep replacing batch save with per-row sync mutations). Per-row
// inputs (`CreatePendingCutLogInput` / `UpdatePendingCutLogInput` /
// `DeletePendingCutLogInput`) are re-exported above from the domain.

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
