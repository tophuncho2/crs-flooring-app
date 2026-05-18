"use client"

import { SidePanelEditStatusPill } from "@/components/side-panel-edit"
import type { ManagementCompanySidePanelController } from "@/modules/management-companies/controllers/use-management-company-side-panel"

export function ManagementCompanySidePanelStatusPill({
  controller,
}: {
  controller: ManagementCompanySidePanelController
}) {
  return (
    <SidePanelEditStatusPill
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      hasConflict={false}
    />
  )
}
