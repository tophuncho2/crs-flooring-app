import type {
  StagedInventoryFilterRecord,
  StagedInventoryRecord,
} from "@builders/db"
import type { StagedInventoryForm } from "@builders/domain"

export type CreateStagedInventoryRowInput = {
  importEntryId: string
  filterRowId: string
  form: StagedInventoryForm
}

export type UpdateStagedInventoryRowInput = {
  importEntryId: string
  rowId: string
  expectedUpdatedAt: string
  form: StagedInventoryForm
}

export type DeleteStagedInventoryRowInput = {
  importEntryId: string
  rowId: string
  expectedUpdatedAt: string
}

// Per-row mutations return the affected row + the recomputed parent
// filter row so the UI updates the parent's remainingStock /
// startingStockSum / childRowCount badges without a refetch. Mirrors
// the cut-log pattern of returning `totalCutSum` alongside the
// mutated row.
export type CreateStagedInventoryRowResult = {
  row: StagedInventoryRecord
  filterRow: StagedInventoryFilterRecord
}

export type UpdateStagedInventoryRowResult = {
  row: StagedInventoryRecord
  filterRow: StagedInventoryFilterRecord
}

export type DeleteStagedInventoryRowResult = {
  deletedId: string
  filterRow: StagedInventoryFilterRecord
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
