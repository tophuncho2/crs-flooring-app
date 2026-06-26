export type WorkOrderPrimarySectionActions = {
  saveLabel: string
  savingLabel: string
  onSave: () => void
  onDiscard: () => void
}

/**
 * Centralizes the labels for the WO primary section's record-level toolbar
 * (Save / Discard inside `RecordPrimarySectionInstance`). Caller supplies the
 * two callbacks; this returns the shape the chrome consumes.
 */
export function workOrderPrimarySectionActions({
  onSave,
  onDiscard,
}: {
  onSave: () => void
  onDiscard: () => void
}): WorkOrderPrimarySectionActions {
  return {
    saveLabel: "Save",
    savingLabel: "Saving Work Order...",
    onSave,
    onDiscard,
  }
}
