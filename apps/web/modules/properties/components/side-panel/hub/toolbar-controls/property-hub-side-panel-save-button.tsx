"use client"

import { SidePanelEditSaveButton } from "@/components/side-panel-edit"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

export function PropertyHubSidePanelSaveButton({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  return (
    <SidePanelEditSaveButton
      isDirty={controller.hasAnyInteraction}
      isSaving={controller.isSaving}
      canSave={controller.canSave}
      onClick={controller.save}
      label="Create"
      savingLabel="Creating…"
    />
  )
}
