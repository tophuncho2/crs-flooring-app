"use client"

import type { SortContract, SortDirection } from "./contracts/sort-contract"

const BUTTON_CLASS_NAME =
  "inline-flex items-center gap-1 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] transition hover:border-sky-500/45"

export type SortToggleProps = SortContract & {
  /** Visual label for ascending direction (e.g. "A-Z" or "1-9"). */
  ascendingLabel?: string
  /** Visual label for descending direction (e.g. "Z-A" or "9-1"). */
  descendingLabel?: string
  className?: string
}

function nextDirection(direction: SortDirection): SortDirection {
  return direction === "asc" ? "desc" : "asc"
}

/**
 * Direction toggle button. Independent of the column-key picker — consumers
 * compose this with their own column selector (or fix the sort key in code
 * and only let users flip direction).
 */
export function SortToggle({
  sortKey,
  direction,
  onChange,
  ascendingLabel = "A-Z",
  descendingLabel = "Z-A",
  className,
}: SortToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange({ sortKey, direction: nextDirection(direction) })}
      className={[BUTTON_CLASS_NAME, className].filter(Boolean).join(" ")}
      aria-label={`Sort ${direction === "asc" ? ascendingLabel : descendingLabel}`}
    >
      <span aria-hidden="true">{direction === "asc" ? "↑" : "↓"}</span>
      <span>{direction === "asc" ? ascendingLabel : descendingLabel}</span>
    </button>
  )
}
