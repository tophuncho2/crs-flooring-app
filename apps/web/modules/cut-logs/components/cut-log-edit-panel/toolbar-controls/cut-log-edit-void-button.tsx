"use client"

import type { FlooringCutLogStatus } from "@builders/domain"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/use-cut-log-edit-panel"

const VOID_BUTTON_CLASS_NAME = [
  "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-all duration-200",
  "border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)]/80",
  "hover:border-blue-500/40 hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] hover:shadow-[0_0_18px_rgba(59,130,246,0.22)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "disabled:hover:border-[var(--panel-border)] disabled:hover:bg-[var(--panel-background)] disabled:hover:text-[var(--foreground)]/80 disabled:hover:shadow-none",
].join(" ")

/**
 * Cut-log-specific void button. No shared primitive: void is a domain
 * action unique to cut logs (reverses a FINAL row). Renders ONLY when the
 * row is FINAL and not already voided — shares one toolbar slot with the
 * finalize button, which owns the PENDING state.
 */
export function CutLogEditVoidButton({
  controller,
  mode,
}: {
  controller: CutLogEditPanelController
  mode: "create" | "edit"
}) {
  if (mode !== "edit") return null

  const cutLog = controller.open?.mode === "edit" ? controller.open.cutLog : null
  const status = (cutLog?.status ?? null) as FlooringCutLogStatus | null
  if (status !== "FINAL" || cutLog?.void) return null

  return (
    <button
      type="button"
      onClick={controller.voidCutLog}
      disabled={controller.isSaving}
      className={VOID_BUTTON_CLASS_NAME}
    >
      Void
    </button>
  )
}
