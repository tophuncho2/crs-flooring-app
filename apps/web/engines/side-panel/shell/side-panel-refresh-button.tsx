"use client"

import { RefreshCw } from "lucide-react"

const BUTTON_CLASS_NAME =
  "inline-flex items-center justify-center rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] p-1.5 text-[var(--foreground)]/80 shadow-sm transition hover:border-blue-500/40 hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"

export type SidePanelRefreshButtonProps = {
  /** Refetches the panel's registered queries (e.g. `controller.refreshAll`). */
  onClick: () => void
  /** True while a refresh is in flight — spins the icon and disables the button. */
  isRefreshing?: boolean
  disabled?: boolean
  ariaLabel?: string
}

/**
 * Title-row "Refresh" action for a side panel. Compact icon button that sits in
 * the shell's `titleEnd` slot. Pure chrome — the consumer wires `onClick` to the
 * engine freshness controller's `refreshAll`, which refetches the open record's
 * detail + child lists without a full page reload.
 */
export function SidePanelRefreshButton({
  onClick,
  isRefreshing = false,
  disabled = false,
  ariaLabel = "Refresh panel",
}: SidePanelRefreshButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isRefreshing}
      className={BUTTON_CLASS_NAME}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <RefreshCw size={13} className={isRefreshing ? "animate-spin" : undefined} />
    </button>
  )
}
