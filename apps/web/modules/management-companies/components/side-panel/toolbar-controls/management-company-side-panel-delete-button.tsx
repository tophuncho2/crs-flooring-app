"use client"

import { SidePanelEditDeleteButton } from "@/components/side-panel-edit"
import type {
  ManagementCompanySidePanelController,
  ManagementCompanySidePanelMode,
} from "@/modules/management-companies/controllers/list/use-management-company-side-panel"

export function ManagementCompanySidePanelDeleteButton({
  controller,
  mode,
}: {
  controller: ManagementCompanySidePanelController
  mode: ManagementCompanySidePanelMode
}) {
  if (mode !== "edit") return null

  return (
    <SidePanelEditDeleteButton
      isSaving={controller.isSaving}
      onClick={controller.deleteCompany}
    />
  )
}
