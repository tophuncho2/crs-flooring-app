"use client"

const BUTTON_BASE_CLASS_NAME =
  "inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--foreground)]/55 outline-none transition hover:bg-[var(--panel-border)]/25 hover:text-[var(--foreground)] focus-visible:ring-1 focus-visible:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-40"

export type ExpandToggleProps = {
  expanded: boolean
  onToggle: () => void
  ariaLabel?: string
  disabled?: boolean
}

/**
 * Chevron-style expand/collapse button. Drops into a parent row's `expand`
 * control column to drive an `ExpandableRow`. The chevron rotates 90° when
 * expanded; aria-expanded is wired automatically.
 */
export function ExpandToggle({ expanded, onToggle, ariaLabel, disabled }: ExpandToggleProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? (expanded ? "Collapse" : "Expand")}
      aria-expanded={expanded}
      disabled={disabled}
      onClick={(event) => {
        // Stop propagation so clicking the toggle doesn't also trigger the
        // parent row's `onClick` handler when the row is interactive.
        event.stopPropagation()
        onToggle()
      }}
      className={BUTTON_BASE_CLASS_NAME}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-block",
          transition: "transform 120ms ease",
          transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
          fontSize: "0.65rem",
          lineHeight: 1,
        }}
      >
        ▶
      </span>
    </button>
  )
}
