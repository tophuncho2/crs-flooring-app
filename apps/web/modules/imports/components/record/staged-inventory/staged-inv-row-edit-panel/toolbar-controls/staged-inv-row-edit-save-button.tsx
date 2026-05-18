"use client"

import { SidePanelEditSaveButton } from "@/components/side-panel-edit"
import type { StagedInvRowEditPanelController } from "@/modules/imports/controllers/record/staged-inventory/use-staged-inv-row-edit-panel"

/**
 * Staged-inv-row side-panel adapter for the shared save button. Create mode
 * is always treated as dirty so a brand-new row can be persisted without
 * re-touching a field; edit mode defers to the controller's dirty state.
 */
export function StagedInvRowEditSaveButton({
  controller,
  mode,
}: {
  controller: StagedInvRowEditPanelController
  mode: "create" | "edit"
}) {
  const isCreate = mode === "create"

  return (
    <SidePanelEditSaveButton
      isDirty={isCreate ? true : controller.isDirty}
      isSaving={controller.isSaving}
      canSave={controller.canSave}
      onClick={controller.save}
      label={isCreate ? "Create" : "Save"}
      savingLabel={isCreate ? "Creating…" : "Saving…"}
    />
  )
}
