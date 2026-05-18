"use client"

import { SidePanelEditDiscardButton } from "@/components/side-panel-edit"
import type { WarehouseSidePanelController } from "@/modules/warehouse/controllers/use-warehouse-side-panel"

/**
 * Warehouse side-panel adapter for the shared discard button. Wired to the
 * controller's `discard()` (resets the form to its saved baseline; does
 * not close the panel).
 */
export function WarehouseSidePanelDiscardButton({
  controller,
}: {
  controller: WarehouseSidePanelController
}) {
  return (
    <SidePanelEditDiscardButton
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      onClick={controller.discard}
    />
  )
}
