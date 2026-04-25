/**
 * Canonical outbox-event payload for "user took N staged rows for import."
 *
 * The application use case orchestrates the actual outbox-row insertion; this
 * helper just builds the payload shape so the domain owns the contract. The
 * relay service polls the outbox and dispatches to the worker queue; the
 * worker reads `stagedRowIds` and materializes each into a live inventory
 * row.
 */
export type StagedImportBatchTakenEvent = {
  importEntryId: string
  stagedRowIds: string[]
  takenAt: string
}

export function buildStagedImportBatchTakenEvent(input: {
  importEntryId: string
  stagedRowIds: ReadonlyArray<string>
  now: Date
}): StagedImportBatchTakenEvent {
  return {
    importEntryId: input.importEntryId,
    stagedRowIds: [...input.stagedRowIds],
    takenAt: input.now.toISOString(),
  }
}
