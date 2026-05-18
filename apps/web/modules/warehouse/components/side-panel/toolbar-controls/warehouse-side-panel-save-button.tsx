"use client"

import { SidePanelEditSaveButton } from "@/components/side-panel-edit"
import type { WarehouseSidePanelController } from "@/modules/warehouse/controllers/use-warehouse-side-panel"

/**
 * Warehouse side-panel adapter for the shared save button. Swaps the label
 * between "Create" (create mode) and "Save" (edit mode); in create mode the
 * button is always treated as dirty so a brand-new warehouse can be created
 * without an explicit field touch.
 */
export function WarehouseSidePanelSaveButton({
  controller,
  mode,
}: {
  controller: WarehouseSidePanelController
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
