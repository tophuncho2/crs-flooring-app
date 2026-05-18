"use client"

import { SidePanelEditStatusPill } from "@/components/side-panel-edit"
import type { StagedInvRowEditPanelController } from "@/modules/imports/controllers/record/staged-inventory/use-staged-inv-row-edit-panel"

/**
 * Staged-inv-row side-panel adapter for the shared status pill. Surfaces
 * dirty / saving state in the footer; no optimistic-lock conflict tracking
 * yet.
 */
export function StagedInvRowEditStatusPill({
  controller,
}: {
  controller: StagedInvRowEditPanelController
}) {
  return (
    <SidePanelEditStatusPill
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      hasConflict={false}
    />
  )
}
