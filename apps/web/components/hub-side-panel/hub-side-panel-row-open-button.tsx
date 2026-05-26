"use client"

import { ArrowRight } from "lucide-react"

const ROW_OPEN_BUTTON_CLASS =
  "inline-flex h-7 w-7 items-center justify-center rounded border border-blue-500/40 bg-[var(--background)] text-[var(--foreground)]/70 transition hover:bg-blue-500/10 hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-50"

export type HubSidePanelRowOpenButtonProps = {
  onClick: () => void
  ariaLabel: string
  title?: string
  disabled?: boolean
}

/**
 * Trailing "open this record" arrow for a hub scoped-row's `action` slot.
 * Shared by the properties and templates lists so the open affordance reads
 * identically everywhere in the hub.
 */
export function HubSidePanelRowOpenButton({
  onClick,
  ariaLabel,
  title,
  disabled,
}: HubSidePanelRowOpenButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={ROW_OPEN_BUTTON_CLASS}
    >
      <ArrowRight size={14} />
    </button>
  )
}
