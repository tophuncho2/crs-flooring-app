"use client"

import { SidePanelEditStatusPill } from "@/components/side-panel-edit"
import type { PropertySidePanelController } from "@/modules/properties/controllers/property-side-panel"

export function PropertySidePanelStatusPill({
  controller,
}: {
  controller: PropertySidePanelController
}) {
  return (
    <SidePanelEditStatusPill
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      hasConflict={false}
    />
  )
}
