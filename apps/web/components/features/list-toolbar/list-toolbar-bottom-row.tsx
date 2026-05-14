"use client"

import type { ReactNode } from "react"

export type ListToolbarBottomRowProps = {
  children: ReactNode
  className?: string
}

/**
 * The bottom slot of a `ListToolbarCell` when two side-by-side controls
 * sit beneath the top slot. Canonical use: the search cell's row 2 with
 * `[Clear all]` on the left and `[count of total label]` on the right.
 *
 * Height is locked to `h-9` so the bottom row of every cell aligns with
 * the chip-button row height across the toolbar.
 */
export function ListToolbarBottomRow({
  children,
  className,
}: ListToolbarBottomRowProps) {
  return (
    <div
      className={[
        "flex h-9 items-center justify-between gap-2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  )
}
