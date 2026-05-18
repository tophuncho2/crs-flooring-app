"use client"

import { SidePanelEditSaveButton } from "@/components/side-panel-edit"
import type {
  ManagementCompanySidePanelController,
  ManagementCompanySidePanelMode,
} from "@/modules/management-companies/controllers/list/use-management-company-side-panel"

export function ManagementCompanySidePanelSaveButton({
  controller,
  mode,
}: {
  controller: ManagementCompanySidePanelController
  mode: ManagementCompanySidePanelMode
}) {
  const isCreate = mode === "create"

  return (
    <SidePanelEditSaveButton
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      canSave={controller.canSave}
      onClick={controller.save}
      label={isCreate ? "Create" : "Save"}
      savingLabel={isCreate ? "Creating…" : "Saving…"}
    />
  )
}
