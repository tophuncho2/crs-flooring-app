"use client"

import { forwardRef } from "react"
import { ArrowRight } from "lucide-react"

const TRIGGER_BASE_CLASS_NAME =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2 text-left text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"

// Matches the hub list-row action button so the "open linked record" shortcut
// reads identically wherever a record can be opened from a list or a cell.
const OPEN_LINKED_BUTTON_CLASS_NAME =
  "inline-flex h-7 w-7 shrink-0 items-center justify-center self-center rounded border border-blue-500/40 bg-[var(--background)] text-[var(--foreground)]/70 transition hover:bg-blue-500/10 hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type PickerTriggerProps = {
  expanded: boolean
  onToggle: () => void
  selectedLabel: string | null
  placeholder?: string
  disabled?: boolean
  disabledPlaceholder?: string
  ariaLabel?: string
  /**
   * Optional "open linked record" shortcut. When provided, a trailing arrow
   * button renders alongside the trigger — but only once a value is selected
   * (there's nothing to open otherwise).
   */
  onOpenLinked?: () => void
  openLinkedAriaLabel?: string
  openLinkedDisabled?: boolean
}

/**
 * In-panel picker trigger styled to match the standard async dropdown. When
 * clicked, the consumer flips the hub panel into a picker-takeover mode and
 * the panel body renders {@link PickerList}. An optional trailing
 * arrow button ({@link PickerTriggerProps.onOpenLinked}) opens the
 * selected record without expanding the picker.
 */
export const PickerTrigger = forwardRef<
  HTMLButtonElement,
  PickerTriggerProps
>(function PickerTrigger(
  {
    expanded,
    onToggle,
    selectedLabel,
    placeholder = "Select",
    disabled,
    disabledPlaceholder,
    ariaLabel,
    onOpenLinked,
    openLinkedAriaLabel,
    openLinkedDisabled,
  },
  ref,
) {
  const effectivePlaceholder = disabled && disabledPlaceholder ? disabledPlaceholder : placeholder
  const label = selectedLabel ?? effectivePlaceholder
  const hasValue = selectedLabel !== null
  const showOpenLinked = onOpenLinked !== undefined && hasValue

  const trigger = (
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

  if (!showOpenLinked) {
    return trigger
  }

  return (
    <div className="flex items-stretch gap-1.5">
      <div className="min-w-0 flex-1">{trigger}</div>
      <button
        type="button"
        aria-label={openLinkedAriaLabel}
        title={openLinkedAriaLabel}
        onClick={onOpenLinked}
        disabled={openLinkedDisabled}
        className={OPEN_LINKED_BUTTON_CLASS_NAME}
      >
        <ArrowRight size={14} />
      </button>
    </div>
  )
})
