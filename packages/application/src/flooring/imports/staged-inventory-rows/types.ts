import type { StagedInventoryRecord } from "@builders/db"
import type { StagedInventoryRowsDiff } from "@builders/domain"

export type SaveStagedInventoryRowsInput = {
  importEntryId: string
  diff: StagedInventoryRowsDiff
}

export type SaveStagedInventoryRowsResult = {
  rows: StagedInventoryRecord[]
  tempIdMap: Record<string, string>
}

export type MarkStagedRowsForImportInput = {
  importEntryId: string
  stagedRowIds: string[]
  requestedBy: {
    userId: string
    userEmail: string
  }
}

export type MarkStagedRowsForImportResult = {
  markedRowIds: string[]
  outboxEventId: string
  wasDuplicate: boolean
}

export type MaterializeImportedStagedRowsResult = {
  created: Array<{ id: string; inventoryNumber: string }>
  materializedStagedRowIds: string[]
}
