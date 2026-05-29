"use client"

import type { ReactNode } from "react"

export type ListToolbarProps = {
  children: ReactNode
  className?: string
  /**
   * Render the bottom divider separating the strip from the content below.
   * Defaults to `true`. Set `false` when the toolbar is presented as a
   * standalone floating card — its container then supplies the full rounded
   * border, so the divider would read as a stray line above the card edge.
   */
  showDivider?: boolean
}

/**
 * The "table controls" strip between a list-view section header and the
 * column headers. Hosts a row of fixed-width `ListToolbarCell`s, each
 * with two stacked slots (top + bottom). Cells stretch to the same total
 * height so the strip reads as an even grid.
 *
 * Layout rules:
 *   - Flex-wrap with `items-stretch` → every cell in a row matches the
 *     tallest cell's height.
 *   - Tight horizontal `gap-3` between cells; `px-4 py-4` outer padding.
 *   - Cells own their own internal row spacing (`gap-2`).
 *   - `showDivider` (default true) draws the bottom border; turn it off when
 *     the toolbar floats as its own rounded card above a separate table.
 *
 * Right-edge slot for action buttons (e.g. "+ New") is reserved for a
 * future addition; the toolbar is left-aligned today.
 */
export function ListToolbar({ children, className, showDivider = true }: ListToolbarProps) {
  return (
    <div
      className={[
        "flex flex-wrap items-stretch gap-3 px-4 py-4",
        showDivider ? "border-b border-[var(--panel-border)]" : null,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  )
}
