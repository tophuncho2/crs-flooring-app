"use client"

import { canRelinkAdjustment } from "@builders/domain"
import { SidePanelEditSaveButton } from "@/components/side-panel-edit"
import type { AdjustmentEditPanelController } from "@/modules/adjustments/controllers/adjustment-side-panel"

/**
 * Adjustment side-panel adapter for the shared save button. Mirrors the server
 * gate: save is allowed whenever the row is relinkable (PENDING or FINAL,
 * not voided / queued). A FINAL row only accepts the link patch — the
 * value cells stay read-only — but a dirty link change still routes
 * through the save button. Create mode is always treated as dirty so a
 * fresh adjustment can be persisted without re-touching a field.
 */
export function AdjustmentEditSaveButton({
  controller,
  mode,
}: {
  controller: AdjustmentEditPanelController
  mode: "create" | "edit"
}) {
  const isCreate = mode === "create"
  const adjustment = controller.open?.mode === "edit" ? controller.open.adjustment : null

  // Link symmetry: either both null (unlinked) or both set. Save needs to
  // be disabled when only one side is picked — otherwise the server 400s
  // on the both-or-neither validator. Mirrors `assertAdjustmentLinkageSymmetry`.
  const linkAsymmetric =
    !isCreate &&
    (controller.form.workOrderId === null) !==
      (controller.form.workOrderItemId === null)

  const canSave = isCreate
    ? controller.form.inventoryId !== "" && controller.form.quantity.trim() !== ""
    : controller.form.quantity.trim() !== "" && !linkAsymmetric

  const isLocked = !isCreate && adjustment != null && !canRelinkAdjustment(adjustment)
  const title = isLocked
    ? "A worker job is in flight on this adjustment. Try again once it settles."
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
