"use client"

import type { FlooringInventoryAdjustmentStatus } from "@builders/domain"
import { SidePanelEditDeleteButton } from "@/components/side-panel-edit"
import type { AdjustmentEditPanelController } from "@/modules/adjustments/controllers/adjustment-side-panel"

/**
 * Adjustment side-panel adapter for the shared delete button. Edit mode only;
 * disabled unless the row is PENDING (matches the server guard — finalized
 * or voided rows must be reversed before deletion).
 */
export function AdjustmentEditDeleteButton({
  controller,
  mode,
}: {
  controller: AdjustmentEditPanelController
  mode: "create" | "edit"
}) {
  if (mode !== "edit") return null

  const adjustment = controller.open?.mode === "edit" ? controller.open.adjustment : null
  const status = (adjustment?.status ?? null) as FlooringInventoryAdjustmentStatus | null
  const isPending = status === "PENDING"
  const isDisabled = controller.isSaving || !isPending
  const title =
    isDisabled && !controller.isSaving ? "Only pending adjustments can be deleted" : undefined

  return (
    <SidePanelEditDeleteButton
      isSaving={controller.isSaving}
      disabled={isDisabled}
      onClick={controller.deleteAdjustment}
      title={title}
    />
  )
}
