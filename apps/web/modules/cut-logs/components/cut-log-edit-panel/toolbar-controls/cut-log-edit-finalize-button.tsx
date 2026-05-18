"use client"

import type { FlooringCutLogStatus } from "@builders/domain"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/cut-log-side-panel"

const FINALIZE_BUTTON_CLASS_NAME = [
  "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60",
  "bg-blue-500 text-black hover:bg-blue-400",
  "hover:shadow-[0_0_18px_rgba(59,130,246,0.28)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
  "disabled:cursor-not-allowed",
].join(" ")

/**
 * Cut-log-specific finalize button. No shared primitive: finalize is a
 * domain action unique to cut logs. Renders ONLY when the row is PENDING
 * — shares one toolbar slot with the void button, which takes over once
 * the row is finalized. Within PENDING, disabled while saving or dirty.
 */
export function CutLogEditFinalizeButton({
  controller,
  mode,
}: {
  controller: CutLogEditPanelController
  mode: "create" | "edit"
}) {
  if (mode !== "edit") return null

  const cutLog = controller.open?.mode === "edit" ? controller.open.cutLog : null
  const status = (cutLog?.status ?? null) as FlooringCutLogStatus | null
  if (status !== "PENDING") return null

  const isDisabled = controller.isSaving || controller.isDirty
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
