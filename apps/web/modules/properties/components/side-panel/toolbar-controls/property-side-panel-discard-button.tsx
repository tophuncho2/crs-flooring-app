"use client"

import { SidePanelEditDiscardButton } from "@/components/side-panel-edit"
import type { PropertySidePanelController } from "@/modules/properties/controllers/property-side-panel"

export function PropertySidePanelDiscardButton({
  controller,
}: {
  controller: PropertySidePanelController
}) {
  return (
    <SidePanelEditDiscardButton
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      onClick={controller.discard}
    />
  )
}
