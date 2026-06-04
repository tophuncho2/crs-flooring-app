"use client"

import type { ReactNode } from "react"

export type ListToolbarBottomRowProps = {
  left?: ReactNode
  right?: ReactNode
  className?: string
}

/**
 * The bottom slot of a `ListToolbarCell` with two anchored sub-slots —
 * `left` pinned to the start of the row, `right` pinned to the end.
 * Either side may render `null` (e.g. a hidden clear-all button); the
 * opposite side keeps its anchor regardless.
 *
 * Height is locked to `h-9` so the bottom row aligns with the
 * chip-button row height across every toolbar cell.
 */
export function ListToolbarBottomRow({
  left,
  right,
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
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  )
}
