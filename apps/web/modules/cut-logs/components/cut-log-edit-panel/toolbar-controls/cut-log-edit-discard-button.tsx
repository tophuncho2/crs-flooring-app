"use client"

import { SidePanelEditDiscardButton } from "@/components/side-panel-edit"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/use-cut-log-edit-panel"

/**
 * Cut-log side-panel adapter for the shared discard button. Reverts the
 * form to its saved baseline without closing the panel.
 */
export function CutLogEditDiscardButton({
  controller,
}: {
  controller: CutLogEditPanelController
}) {
  return (
    <SidePanelEditDiscardButton
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      onClick={controller.discard}
    />
  )
}
