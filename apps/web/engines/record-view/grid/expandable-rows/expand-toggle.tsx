"use client"

const BUTTON_BASE_CLASS_NAME =
  "group inline-flex h-7 w-7 items-center justify-center rounded-md text-[var(--foreground)]/50 outline-none transition hover:bg-[var(--panel-border)]/30 hover:text-[var(--foreground)] focus-visible:ring-1 focus-visible:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-40"
const BUTTON_EXPANDED_CLASS_NAME =
  "bg-sky-500/15 text-sky-700 hover:bg-sky-500/20 hover:text-sky-700"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type ExpandToggleProps = {
  expanded: boolean
  onToggle: () => void
  ariaLabel?: string
  disabled?: boolean
}

/**
 * Chevron expand/collapse button. Drops into a parent row's `expand` control
 * column to drive an `ExpandableRow`. The chevron rotates 90° on expand; the
 * button itself adopts a subtle sky tint to make the expanded state visible
 * even when the children area is scrolled out of view.
 */
export function ExpandToggle({ expanded, onToggle, ariaLabel, disabled }: ExpandToggleProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? (expanded ? "Collapse" : "Expand")}
      aria-expanded={expanded}
      disabled={disabled}
      onClick={(event) => {
        // Stop propagation so the toggle never fires the parent row's onClick.
        event.stopPropagation()
        onToggle()
      }}
      className={joinClassNames(
        BUTTON_BASE_CLASS_NAME,
        expanded ? BUTTON_EXPANDED_CLASS_NAME : undefined,
      )}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          transition: "transform 160ms cubic-bezier(0.4, 0, 0.2, 1)",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        }}
      >
        <ChevronRightIcon />
      </span>
    </button>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      width={11}
      height={11}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.25 2.5 L7.75 6 L4.25 9.5" />
    </svg>
  )
}
