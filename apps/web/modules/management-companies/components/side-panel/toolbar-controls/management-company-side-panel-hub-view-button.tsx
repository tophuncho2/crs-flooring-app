"use client"

import type { ManagementCompanySidePanelController } from "@/modules/management-companies/controllers/list/use-management-company-side-panel"

const BASE_CLASS_NAME = [
  "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200",
  "border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)]/80",
  "hover:border-blue-500/40 hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] hover:shadow-[0_0_18px_rgba(59,130,246,0.22)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
].join(" ")

const DISABLED_CLASS_NAME =
  "cursor-not-allowed opacity-60 hover:border-[var(--panel-border)] hover:bg-[var(--panel-background)] hover:text-[var(--foreground)]/80 hover:shadow-none"

/**
 * "Open Hub View" affordance for the management-company side panel. Always
 * rendered; disabled in create mode (no id yet). After a successful create,
 * the controller flips its internal `recordId` so the button enables
 * without remount. Opens the read-only Hub View side panel via the
 * parent-supplied callback (no URL navigation).
 */
export function ManagementCompanySidePanelHubViewButton({
  controller,
  onOpenHubView,
}: {
  controller: ManagementCompanySidePanelController
  onOpenHubView: (managementCompanyId: string) => void
}) {
  const id = controller.recordId
  const isDisabled = id === null

  if (isDisabled) {
    return (
      <span
        aria-disabled="true"
        className={[BASE_CLASS_NAME, DISABLED_CLASS_NAME].join(" ")}
      >
        Open Hub View
      </span>
    )
  }

  return (
    <button type="button" onClick={() => onOpenHubView(id)} className={BASE_CLASS_NAME}>
      Open Hub View
    </button>
  )
}
