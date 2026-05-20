"use client"

import { canRelinkCutLog, type FlooringCutLogStatus } from "@builders/domain"
import { SidePanelEditSaveButton } from "@/components/side-panel-edit"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/cut-log-side-panel"

/**
 * Cut-log side-panel adapter for the shared save button. Mirrors the server
 * gate: save is allowed whenever the row is relinkable (PENDING or FINAL,
 * not voided / queued). A FINAL row only accepts the link patch — the
 * value cells stay read-only — but a dirty link change still routes
 * through the save button. Create mode is always treated as dirty so a
 * fresh cut log can be persisted without re-touching a field.
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

  const isLocked = !isCreate && cutLog != null && !canRelinkCutLog(cutLog)
  const title = isLocked
    ? status === "VOID"
      ? "This cut log is voided. No further changes are permitted."
      : "A worker job is in flight on this cut log. Try again once it settles."
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
