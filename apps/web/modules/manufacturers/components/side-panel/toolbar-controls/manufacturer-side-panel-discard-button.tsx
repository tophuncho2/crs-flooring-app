"use client"

import { SidePanelEditDiscardButton } from "@/components/side-panel-edit"
import type { ManufacturerSidePanelController } from "@/modules/manufacturers/controllers/use-manufacturer-side-panel"

export function ManufacturerSidePanelDiscardButton({
  controller,
}: {
  controller: ManufacturerSidePanelController
}) {
  return (
    <SidePanelEditDiscardButton
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      onClick={controller.discard}
    />
  )
}
