"use client"

import type { ReactNode } from "react"

export type ListToolbarProps = {
  children: ReactNode
  className?: string
}

/**
 * The "table controls" strip between a list-view section header and the
 * column headers. Hosts the search input, filter chips, the clear-all
 * button, and the row count.
 *
 * Horizontal flex with wrap. Vertical padding and wrap-gap are tuned so
 * stacked chip pairs (`FilterColumn`) breathe at the same scale as
 * single-row chip clusters.
 */
export function ListToolbar({ children, className }: ListToolbarProps) {
  return (
    <div
      className={[
        "flex flex-wrap items-center gap-x-2 gap-y-3 border-b border-[var(--panel-border)] px-4 py-4",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  )
}
