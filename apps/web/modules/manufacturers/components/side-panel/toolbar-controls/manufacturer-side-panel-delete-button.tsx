"use client"

import { SidePanelEditDeleteButton } from "@/components/side-panel-edit"
import type { ManufacturerSidePanelController } from "@/modules/manufacturers/controllers/use-manufacturer-side-panel"

export function ManufacturerSidePanelDeleteButton({
  controller,
  mode,
}: {
  controller: ManufacturerSidePanelController
  mode: "create" | "edit"
}) {
  if (mode !== "edit") return null

  return (
    <SidePanelEditDeleteButton
      isSaving={controller.isSaving}
      onClick={controller.deleteManufacturer}
    />
  )
}
