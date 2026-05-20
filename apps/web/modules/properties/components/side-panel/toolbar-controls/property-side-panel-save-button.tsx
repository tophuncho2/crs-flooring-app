"use client"

import { SidePanelEditSaveButton } from "@/components/side-panel-edit"
import type {
  PropertySidePanelController,
  PropertySidePanelMode,
} from "@/modules/properties/controllers/side-panel/use-property-side-panel"

export function PropertySidePanelSaveButton({
  controller,
  mode,
}: {
  controller: PropertySidePanelController
  mode: PropertySidePanelMode
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
