"use client"

import { forwardRef } from "react"

// Mirrors the AsyncRichDropdown trigger styling so this in-panel trigger
// reads visually as a standard dropdown. Per the no-primitive-edits rule,
// the tailwind utilities are copied locally.
const TRIGGER_BASE_CLASS_NAME =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type PropertyHubViewPropertyFilterTriggerProps = {
  expanded: boolean
  onToggle: () => void
  selectedLabel: string | null
  placeholder?: string
  ariaLabel?: string
}

export const PropertyHubViewPropertyFilterTrigger = forwardRef<
  HTMLButtonElement,
  PropertyHubViewPropertyFilterTriggerProps
>(function PropertyHubViewPropertyFilterTrigger(
  { expanded, onToggle, selectedLabel, placeholder = "All properties", ariaLabel },
  ref,
) {
  const label = selectedLabel ?? placeholder
  const hasValue = selectedLabel !== null

  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={expanded}
      onClick={onToggle}
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
