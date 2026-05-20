"use client"

import { forwardRef } from "react"

// Visual parity with AsyncRichDropdown's trigger so the three picker rows in
// the sticky header stay pixel-identical. The Template row opts out of the
// popover UI — clicks just toggle the side-panel body into options mode — so
// the trigger lives here and replicates the primitive's tailwind utilities
// verbatim. If the primitive's trigger styling shifts, this drifts; that's
// the cost of leaving the primitive untouched.
const TRIGGER_BASE_CLASS_NAME =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type TemplateSyncTemplateTriggerProps = {
  propertyId: string | null
  expanded: boolean
  onToggle: () => void
  selectedLabel: string | null
  placeholder?: string
  disabledPlaceholder?: string
  ariaLabel?: string
}

export const TemplateSyncTemplateTrigger = forwardRef<
  HTMLButtonElement,
  TemplateSyncTemplateTriggerProps
>(function TemplateSyncTemplateTrigger(
  {
    propertyId,
    expanded,
    onToggle,
    selectedLabel,
    placeholder = "Select a template",
    disabledPlaceholder = "Select a property first",
    ariaLabel,
  },
  ref,
) {
  const disabled = propertyId === null
  const label = selectedLabel ?? (disabled ? disabledPlaceholder : placeholder)
  const hasValue = selectedLabel !== null

  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      aria-haspopup="listbox"
      aria-expanded={expanded}
      disabled={disabled}
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
