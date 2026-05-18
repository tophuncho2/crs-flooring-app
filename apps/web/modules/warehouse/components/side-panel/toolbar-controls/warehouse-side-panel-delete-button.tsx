"use client"

import { SidePanelEditDeleteButton } from "@/components/side-panel-edit"
import type { WarehouseSidePanelController } from "@/modules/warehouse/controllers/use-warehouse-side-panel"

/**
 * Warehouse side-panel adapter for the shared delete button. Renders only
 * in edit mode — there is nothing to delete during a create flow.
 */
export function WarehouseSidePanelDeleteButton({
  controller,
  mode,
}: {
  controller: WarehouseSidePanelController
  mode: "create" | "edit"
}) {
  if (mode !== "edit") return null

  return (
    <SidePanelEditDeleteButton
      isSaving={controller.isSaving}
      onClick={controller.deleteWarehouse}
    />
  )
}
