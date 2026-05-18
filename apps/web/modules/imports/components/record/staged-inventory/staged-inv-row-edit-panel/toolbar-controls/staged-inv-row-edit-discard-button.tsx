"use client"

import { SidePanelEditDiscardButton } from "@/components/side-panel-edit"
import type { StagedInvRowEditPanelController } from "@/modules/imports/controllers/record/staged-inventory/use-staged-inv-row-edit-panel"

/**
 * Staged-inv-row side-panel adapter for the shared discard button. Reverts
 * the form to its saved baseline without closing the panel.
 */
export function StagedInvRowEditDiscardButton({
  controller,
}: {
  controller: StagedInvRowEditPanelController
}) {
  return (
    <SidePanelEditDiscardButton
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      onClick={controller.discard}
    />
  )
}
