"use client"

import type { FlooringInventoryAdjustmentStatus } from "@builders/domain"
import { SidePanelEditDeleteButton } from "@/components/side-panel-edit"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/cut-log-side-panel"

/**
 * Cut-log side-panel adapter for the shared delete button. Edit mode only;
 * disabled unless the row is PENDING (matches the server guard — finalized
 * or voided rows must be reversed before deletion).
 */
export function CutLogEditDeleteButton({
  controller,
  mode,
}: {
  controller: CutLogEditPanelController
  mode: "create" | "edit"
}) {
  if (mode !== "edit") return null

  const cutLog = controller.open?.mode === "edit" ? controller.open.cutLog : null
  const status = (cutLog?.status ?? null) as FlooringInventoryAdjustmentStatus | null
  const isPending = status === "PENDING"
  const isDisabled = controller.isSaving || !isPending
  const title =
    isDisabled && !controller.isSaving ? "Only pending cut logs can be deleted" : undefined

  return (
    <SidePanelEditDeleteButton
      isSaving={controller.isSaving}
      disabled={isDisabled}
      onClick={controller.deleteCutLog}
      title={title}
    />
  )
}
