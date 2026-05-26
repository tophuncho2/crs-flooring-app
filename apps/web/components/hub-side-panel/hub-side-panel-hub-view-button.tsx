"use client"

import { ChevronLeft } from "lucide-react"

const BUTTON_CLASS_NAME =
  "inline-flex items-center gap-1 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1 text-xs font-semibold tracking-tight text-[var(--foreground)]/80 shadow-sm transition hover:border-blue-500/40 hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"

export type HubSidePanelHubViewButtonProps = {
  onClick: () => void
  disabled?: boolean
}

/**
 * Title-row "Hub view" navigation. Discards local draft changes and pops the
 * panel back into the hub's view mode. Rendered in the shell's `titleEnd` slot
 * (left of the add buttons) only while a section-edit mode has a parent hub to
 * return to. Compact to sit alongside the "+Template" / "+Hub" pills.
 */
export function HubSidePanelHubViewButton({
  onClick,
  disabled,
}: HubSidePanelHubViewButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={BUTTON_CLASS_NAME}
      aria-label="Open hub view (discards changes)"
    >
      <ChevronLeft size={13} />
      <span>Hub view</span>
    </button>
  )
}
