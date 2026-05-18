"use client"

import { SidePanelEditStatusPill } from "@/components/side-panel-edit"
import type { ManufacturerSidePanelController } from "@/modules/manufacturers/controllers/use-manufacturer-side-panel"

export function ManufacturerSidePanelStatusPill({
  controller,
}: {
  controller: ManufacturerSidePanelController
}) {
  return (
    <SidePanelEditStatusPill
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      hasConflict={false}
    />
  )
}
