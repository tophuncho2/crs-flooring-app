"use client"

import { SidePanelEditDiscardButton } from "@/components/side-panel-edit"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

export function PropertyHubSidePanelDiscardButton({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  return (
    <SidePanelEditDiscardButton
      isDirty={controller.hasAnyInteraction}
      isSaving={controller.isSaving}
      onClick={controller.discard}
    />
  )
}
