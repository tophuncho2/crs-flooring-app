"use client"

import { SidePanelEditDiscardButton } from "@/components/side-panel-edit"
import type { AdjustmentEditPanelController } from "@/modules/adjustments/controllers/adjustment-side-panel"

/**
 * Adjustment side-panel adapter for the shared discard button. Reverts the
 * form to its saved baseline without closing the panel.
 */
export function AdjustmentEditDiscardButton({
  controller,
}: {
  controller: AdjustmentEditPanelController
}) {
  return (
    <SidePanelEditDiscardButton
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      onClick={controller.discard}
    />
  )
}
