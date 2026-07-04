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
