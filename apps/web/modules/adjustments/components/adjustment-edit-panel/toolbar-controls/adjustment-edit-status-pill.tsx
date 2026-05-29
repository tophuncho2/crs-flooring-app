"use client"

import { SidePanelEditStatusPill } from "@/components/side-panel-edit"
import type { AdjustmentEditPanelController } from "@/modules/adjustments/controllers/adjustment-side-panel"

/**
 * Adjustment side-panel adapter for the shared status pill. Surfaces dirty /
 * saving state in the footer; no optimistic-lock conflict tracking yet.
 */
export function AdjustmentEditStatusPill({
  controller,
}: {
  controller: AdjustmentEditPanelController
}) {
  return (
    <SidePanelEditStatusPill
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      hasConflict={false}
    />
  )
}
