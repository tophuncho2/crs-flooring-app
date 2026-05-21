"use client"

import { forwardRef } from "react"

const TRIGGER_BASE_CLASS_NAME =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type HubSidePanelPickerTriggerProps = {
  expanded: boolean
  onToggle: () => void
  selectedLabel: string | null
  placeholder?: string
  disabled?: boolean
  disabledPlaceholder?: string
  ariaLabel?: string
}

/**
 * In-panel picker trigger styled to match the standard async dropdown. When
 * clicked, the consumer flips the hub panel into a picker-takeover mode and
 * the panel body renders {@link HubSidePanelPicker}.
 */
export const HubSidePanelPickerTrigger = forwardRef<
  HTMLButtonElement,
  HubSidePanelPickerTriggerProps
>(function HubSidePanelPickerTrigger(
  {
    expanded,
    onToggle,
    selectedLabel,
    placeholder = "Select",
    disabled,
    disabledPlaceholder,
    ariaLabel,
  },
  ref,
) {
  const effectivePlaceholder = disabled && disabledPlaceholder ? disabledPlaceholder : placeholder
  const label = selectedLabel ?? effectivePlaceholder
  const hasValue = selectedLabel !== null

  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={expanded}
      onClick={onToggle}
      disabled={disabled}
      className={TRIGGER_BASE_CLASS_NAME}
    >
      <span
        className={joinClassNames(
          "min-w-0 truncate",
          !hasValue ? "text-[var(--foreground)]/60" : undefined,
        )}
      >
        {label}
      </span>
      <span aria-hidden="true" className="shrink-0 text-[var(--foreground)]/60">
        {expanded ? "▴" : "▾"}
      </span>
    </button>
  )
})
