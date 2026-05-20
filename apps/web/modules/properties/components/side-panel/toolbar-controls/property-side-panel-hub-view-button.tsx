"use client"

import type { PropertySidePanelController } from "@/modules/properties/controllers/property-side-panel"

const BASE_CLASS_NAME = [
  "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-200",
  "border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)]/80",
  "hover:border-blue-500/40 hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] hover:shadow-[0_0_18px_rgba(59,130,246,0.22)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
].join(" ")

const DISABLED_CLASS_NAME =
  "cursor-not-allowed opacity-60 hover:border-[var(--panel-border)] hover:bg-[var(--panel-background)] hover:text-[var(--foreground)]/80 hover:shadow-none"

/**
 * "Open Hub View" affordance for the property side panel. Disabled in
 * create mode and when the property has no linked management company.
 * Tracks `form.managementCompanyId` so linking a company in the panel
 * enables the button without a remount. Opens the read-only Hub View
 * side panel via the parent-supplied callback (no URL navigation).
 */
export function PropertySidePanelHubViewButton({
  controller,
  onOpenHubView,
}: {
  controller: PropertySidePanelController
  onOpenHubView: (managementCompanyId: string) => void
}) {
  const managementCompanyId = controller.form.managementCompanyId.trim()
  const inEditMode = controller.recordId !== null
  const isDisabled = !inEditMode || managementCompanyId === ""

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
    <button
      type="button"
      onClick={() => onOpenHubView(managementCompanyId)}
      className={BASE_CLASS_NAME}
    >
      Open Hub View
    </button>
  )
}
