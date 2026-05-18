"use client"

import { isCutLogPendingEditable, type FlooringCutLogStatus } from "@builders/domain"
import { SidePanelEditSaveButton } from "@/components/side-panel-edit"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/use-cut-log-edit-panel"

/**
 * Cut-log side-panel adapter for the shared save button. Mirrors the server
 * guard: a row that isn't pending-editable cannot be saved, and the disabled
 * tooltip explains why. Create mode is always treated as dirty so a fresh
 * cut log can be persisted without re-touching a field.
 */
export function CutLogEditSaveButton({
  controller,
  mode,
}: {
  controller: CutLogEditPanelController
  mode: "create" | "edit"
}) {
  const isCreate = mode === "create"
  const cutLog = controller.open?.mode === "edit" ? controller.open.cutLog : null
  const status = (cutLog?.status ?? null) as FlooringCutLogStatus | null

  const canSave = isCreate
    ? controller.form.inventoryId !== "" && controller.form.cut.trim() !== ""
    : controller.form.cut.trim() !== ""

  const isLocked = !isCreate && cutLog != null && !isCutLogPendingEditable(cutLog)
  const title = isLocked
    ? status === "VOID"
      ? "This cut log is voided. No further changes are permitted."
      : "This cut log is finalized. Use Void to reverse it."
    : undefined

  const isDirty = isCreate ? true : controller.isDirty
  const isDisabled = controller.isSaving || !canSave || (!isCreate && !isDirty) || isLocked

  return (
    <SidePanelEditSaveButton
      isDirty={isDirty}
      isSaving={controller.isSaving}
      canSave={canSave}
      disabled={isDisabled}
      onClick={controller.save}
      label={isCreate ? "Create" : "Save"}
      savingLabel={isCreate ? "Creating…" : "Saving…"}
      title={title}
    />
  )
}
