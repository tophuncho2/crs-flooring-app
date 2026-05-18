"use client"

import { SidePanelEditDeleteButton } from "@/components/side-panel-edit"
import type { StagedInvRowEditPanelController } from "@/modules/imports/controllers/record/staged-inventory/use-staged-inv-row-edit-panel"

/**
 * Staged-inv-row side-panel adapter for the shared delete button. Edit mode
 * only; disabled unless the row is DRAFT (mirrors the server guard — only
 * draft rows can be removed).
 */
export function StagedInvRowEditDeleteButton({
  controller,
  mode,
}: {
  controller: StagedInvRowEditPanelController
  mode: "create" | "edit"
}) {
  if (mode !== "edit") return null

  const row = controller.open?.mode === "edit" ? controller.open.row : null
  const isDraft = row?.status === "DRAFT"
  const isDisabled = controller.isSaving || !isDraft
  const title =
    isDisabled && !controller.isSaving ? "Only draft rows can be deleted" : undefined

  return (
    <SidePanelEditDeleteButton
      isSaving={controller.isSaving}
      disabled={isDisabled}
      onClick={controller.deleteRow}
      title={title}
    />
  )
}
