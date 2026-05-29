"use client"

import type { ReactNode } from "react"

export type SidePanelPreviewReadonlyRowProps = {
  /** Left column label (rendered uppercase / muted). */
  label: ReactNode
  /** Right column value. Rendered with truncation by default. */
  value: ReactNode
  /** When true, the value preserves whitespace and wraps instead of truncating. */
  multiline?: boolean
}

/**
 * Label / value row for read-only summary content inside a
 * {@link SidePanelPreviewReadonlySection}. Two-column grid:
 * fixed-width label, flexible value. Mirrors the template-sync preview
 * header's row treatment so consumers (adjustments, future record-preview
 * panels) stay visually aligned.
 */
export function SidePanelPreviewReadonlyRow({
  label,
  value,
  multiline = false,
}: SidePanelPreviewReadonlyRowProps) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
      <span className="text-xs uppercase tracking-wide text-[var(--foreground)]/55">
        {label}
      </span>
      <span
        className={
          multiline
            ? "whitespace-pre-wrap text-[var(--foreground)]/85"
            : "truncate text-[var(--foreground)]/85"
        }
      >
        {value}
      </span>
    </div>
  )
}
