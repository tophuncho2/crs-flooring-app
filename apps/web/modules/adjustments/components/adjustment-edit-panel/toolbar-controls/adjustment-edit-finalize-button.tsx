"use client"

import type { FlooringInventoryAdjustmentStatus } from "@builders/domain"
import type { AdjustmentEditPanelController } from "@/modules/adjustments/controllers/adjustment-side-panel"

const FINALIZE_BUTTON_CLASS_NAME = [
  "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
  "bg-blue-500 text-black hover:bg-blue-400",
  "hover:shadow-[0_0_18px_rgba(59,130,246,0.28)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
  "disabled:cursor-not-allowed",
].join(" ")

/**
 * Adjustment-specific finalize button. No shared primitive: finalize is a
 * domain action unique to adjustments. Renders ONLY when the row is PENDING
 * — shares one toolbar slot with the void button, which takes over once
 * the row is finalized. Within PENDING, disabled while saving or dirty.
 * `disabled` force-disables it (e.g. while a picker takeover owns the body).
 */
export function AdjustmentEditFinalizeButton({
  controller,
  mode,
  disabled = false,
}: {
  controller: AdjustmentEditPanelController
  mode: "create" | "edit"
  disabled?: boolean
}) {
  if (mode !== "edit") return null

  const adjustment = controller.open?.mode === "edit" ? controller.open.adjustment : null
  const status = (adjustment?.status ?? null) as FlooringInventoryAdjustmentStatus | null
  if (status !== "PENDING") return null

  const isDisabled = disabled || controller.isSaving || controller.isDirty
  const title = controller.isDirty ? "Save changes before finalizing" : undefined

  return (
    <button
      type="button"
      onClick={controller.finalize}
      disabled={isDisabled}
      title={title}
      className={FINALIZE_BUTTON_CLASS_NAME}
    >
      {controller.isSaving ? "…" : "Finalize"}
    </button>
  )
}
