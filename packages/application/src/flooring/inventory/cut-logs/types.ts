import type { CutLogRecord } from "@builders/db"
import type { CutLogsDiff } from "@builders/domain"

// ---------------------------------------------------------------------------
// Producer use cases (write outbox event)
// ---------------------------------------------------------------------------

export type SaveCutLogPendingDiffInput = {
  inventoryId: string
  diff: CutLogsDiff
  requestedBy: { userId: string; userEmail: string }
}

export type SaveCutLogPendingDiffResult = {
  outboxEventId: string
  wasDuplicate: boolean
  /**
   * tempId → real-uuid map for the added rows. The producer stamps real
   * UUIDs onto draft entries before writing the outbox event so the
   * worker can apply the diff with deterministic ids.
   */
  tempIdMap: Record<string, string>
}

export type MarkCutLogsForFinalizeInput = {
  inventoryId: string
  cutLogIds: string[]
  requestedBy: { userId: string; userEmail: string }
}

export type MarkCutLogsForFinalizeResult = {
  markedRowIds: string[]
  outboxEventId: string
  wasDuplicate: boolean
}

export type MarkCutLogForVoidInput = {
  inventoryId: string
  cutLogId: string
  requestedBy: { userId: string; userEmail: string }
}

export type MarkCutLogForVoidResult = {
  outboxEventId: string
  wasDuplicate: boolean
}

// ---------------------------------------------------------------------------
// Consumer use cases (worker-side; payload-driven)
// ---------------------------------------------------------------------------

export type ApplyCutLogPendingDiffResult = {
  rows: CutLogRecord[]
  newTotalCutSum: string
}

export type FinalizeCutLogsResult = {
  finalizedRowIds: string[]
  finalCutSequenceByRowId: Record<string, number>
}

export type VoidCutLogResult = {
  row: CutLogRecord
  newTotalCutSum: string
}

// ---------------------------------------------------------------------------
// Sync use case (no worker, no outbox)
// ---------------------------------------------------------------------------

export type UpdateCutLogLinksInput = {
  cutLogId: string
  workOrderId: string | null
  workOrderItemId: string | null
}

export type UpdateCutLogLinksResult = {
  row: CutLogRecord
}
