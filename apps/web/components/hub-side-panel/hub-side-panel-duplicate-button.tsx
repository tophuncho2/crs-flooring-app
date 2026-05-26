"use client"

import { Copy } from "lucide-react"

const BUTTON_CLASS_NAME =
  "inline-flex items-center gap-1 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1 text-xs font-semibold tracking-tight text-[var(--foreground)]/80 shadow-sm transition hover:border-blue-500/40 hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"

export type HubSidePanelDuplicateButtonProps = {
  onClick: () => void
  disabled?: boolean
  label?: string
  ariaLabel?: string
}

/**
 * Title-row "Duplicate" action. Compact pill that sits in the shell's
 * `titleEnd` slot alongside the "Hub view" button and left of the close (X).
 * Pure chrome — the consumer wires `onClick` to whatever duplicate flow it
 * owns (e.g. the inventory hub's `enterDuplicateFromView`).
 */
export function HubSidePanelDuplicateButton({
  onClick,
  disabled,
  label = "Duplicate",
  ariaLabel = "Duplicate",
}: HubSidePanelDuplicateButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={BUTTON_CLASS_NAME}
      aria-label={ariaLabel}
    >
      <Copy size={13} />
      <span>{label}</span>
    </button>
  )
}
