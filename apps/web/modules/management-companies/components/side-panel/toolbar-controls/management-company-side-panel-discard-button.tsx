"use client"

import { SidePanelEditDiscardButton } from "@/components/side-panel-edit"
import type { ManagementCompanySidePanelController } from "@/modules/management-companies/controllers/use-management-company-side-panel"

export function ManagementCompanySidePanelDiscardButton({
  controller,
}: {
  controller: ManagementCompanySidePanelController
}) {
  return (
    <SidePanelEditDiscardButton
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      onClick={controller.discard}
    />
  )
}
