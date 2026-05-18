"use client"

import { SidePanelEditStatusPill } from "@/components/side-panel-edit"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/cut-log-side-panel"

/**
 * Cut-log side-panel adapter for the shared status pill. Surfaces dirty /
 * saving state in the footer; no optimistic-lock conflict tracking yet.
 */
export function CutLogEditStatusPill({
  controller,
}: {
  controller: CutLogEditPanelController
}) {
  return (
    <SidePanelEditStatusPill
      isDirty={controller.isDirty}
      isSaving={controller.isSaving}
      hasConflict={false}
    />
  )
}
