"use client"

import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"

export type SidePanelEditPickerRowProps = {
  /** Label rendered above the picker trigger. */
  label: ReactNode
  /** Currently selected display value. `null` renders the placeholder. */
  value: ReactNode | null
  /** Placeholder text shown when `value` is `null`. */
  placeholder: string
  /** Trigger handler. Wired to a no-op stub today; future passes open a real menu. */
  onOpen?: () => void
  /** Disables the trigger (e.g. adjustment not pending, save in flight). */
  disabled?: boolean
  /** Accessible label for the trigger button. Defaults to `label` when it's a string. */
  ariaLabel?: string
}

/**
 * Picker row primitive for the {@link SidePanelPreview} `stickyHeader` slot.
 * Pure layout: label above a button-styled trigger that mimics a closed
 * dropdown. Today the trigger is a placeholder — the next pass swaps the
 * trigger contents for a real menu/combobox without changing this row's slot
 * in the panel.
 */
export function SidePanelEditPickerRow({
  label,
  value,
  placeholder,
  onOpen,
  disabled = false,
  ariaLabel,
}: SidePanelEditPickerRowProps) {
  const resolvedAriaLabel =
    ariaLabel ?? (typeof label === "string" ? label : undefined)
  const hasValue = value !== null && value !== ""

  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65">
        {label}
      </span>
      <button
        type="button"
        onClick={onOpen}
        disabled={disabled}
        aria-label={resolvedAriaLabel}
        aria-haspopup="listbox"
        className={[
          "flex h-9 items-center justify-between gap-2 rounded-md border px-3 text-sm",
          "border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)]",
          "transition hover:bg-[var(--panel-hover)]",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-[var(--panel-background)]",
        ].join(" ")}
      >
        <span
          className={
            hasValue
              ? "truncate text-left"
              : "truncate text-left text-[var(--foreground)]/45"
          }
        >
          {hasValue ? value : placeholder}
        </span>
        <ChevronDown size={14} className="shrink-0 text-[var(--foreground)]/45" />
      </button>
    </label>
  )
}
