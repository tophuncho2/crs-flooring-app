"use client"

import { SidePanelEditSaveButton } from "@/components/side-panel-edit"
import type { ManufacturerSidePanelController } from "@/modules/manufacturers/controllers/use-manufacturer-side-panel"

export function ManufacturerSidePanelSaveButton({
  controller,
  mode,
}: {
  controller: ManufacturerSidePanelController
  mode: "create" | "edit"
}) {
  const isCreate = mode === "create"

  return (
    <SidePanelEditSaveButton
      isDirty={isCreate ? true : controller.isDirty}
      isSaving={controller.isSaving}
      canSave={controller.isValid}
      onClick={controller.save}
      label={isCreate ? "Create" : "Save"}
      savingLabel={isCreate ? "Creating…" : "Saving…"}
    />
  )
}
