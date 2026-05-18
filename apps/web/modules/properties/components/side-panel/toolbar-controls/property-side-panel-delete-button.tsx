"use client"

import { SidePanelEditDeleteButton } from "@/components/side-panel-edit"
import type {
  PropertySidePanelController,
  PropertySidePanelMode,
} from "@/modules/properties/controllers/use-property-side-panel"

export function PropertySidePanelDeleteButton({
  controller,
  mode,
}: {
  controller: PropertySidePanelController
  mode: PropertySidePanelMode
}) {
  if (mode !== "edit") return null

  return (
    <SidePanelEditDeleteButton
      isSaving={controller.isSaving}
      onClick={controller.deleteProperty}
    />
  )
}
