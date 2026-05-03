import type { CutLogRecord } from "@builders/db"

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

export type FinalizeWorkOrderCutLogInput = {
  workOrderId: string
  cutLogId: string
}

export type FinalizeWorkOrderCutLogResult = {
  cutLog: CutLogRecord
}

export type VoidWorkOrderCutLogInput = {
  workOrderId: string
  cutLogId: string
}
