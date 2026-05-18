import { buildDeleteConfirmationMessage } from "@/components/dialogs/confirm-delete"

export type WorkOrderPrimarySectionActions = {
  saveLabel: string
  savingLabel: string
  onSave: () => void
  onDiscard: () => void
  delete: {
    deleteLabel: string
    deleteConfirmMessage: string
    onDelete: () => void
  }
}

/**
 * Centralizes the labels + confirm copy for the WO primary section's
 * record-level toolbar (Save / Discard inside `RecordPrimarySectionInstance`,
 * Delete inside `RecordMultiSectionPanel.footer`). Caller supplies the
 * three callbacks; this returns the spreadable shape the chrome consumes.
 */
export function workOrderPrimarySectionActions({
  onSave,
  onDiscard,
  onDelete,
}: {
  onSave: () => void
  onDiscard: () => void
  onDelete: () => void
}): WorkOrderPrimarySectionActions {
  return {
    saveLabel: "Save Work Order",
    savingLabel: "Saving Work Order...",
    onSave,
    onDiscard,
    delete: {
      deleteLabel: "Delete Work Order",
      deleteConfirmMessage: buildDeleteConfirmationMessage("work order"),
      onDelete,
    },
  }
}
