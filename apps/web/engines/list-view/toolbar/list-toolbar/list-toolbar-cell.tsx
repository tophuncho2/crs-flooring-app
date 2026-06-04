"use client"

import type { ReactNode } from "react"

export type ListToolbarCellProps = {
  children: ReactNode
  /**
   * Width in base cell units. Defaults to 1 (14rem). Use 2 for a future
   * "2-up" cell (e.g. a 2-row × 2-col calculations card).
   */
  colSpan?: 1 | 2 | 3 | 4
  className?: string
}

const CELL_WIDTH_CLASS: Record<NonNullable<ListToolbarCellProps["colSpan"]>, string> = {
  // 14rem base + 0.75rem gap per extra column.
  1: "w-[14rem]",
  2: "w-[28.75rem]",
  3: "w-[43.5rem]",
  4: "w-[58.25rem]",
}

/**
 * One "cell" of the list toolbar — a fixed-width 2-row stack. Slot two
 * children inside: the first lands in the top row, the second in the
 * bottom row. Both rows hug content; the parent `ListToolbar` stretches
 * the cell to match its siblings' total height.
 *
 * For a single child that should occupy both rows (e.g. a chunky
 * `ListToolbarTallCard`), pass exactly one child — it fills `h-full`
 * automatically.
 */
export function ListToolbarCell({
  children,
  colSpan = 1,
  className,
}: ListToolbarCellProps) {
  return (
    <div
      className={[
        "flex flex-col gap-2",
        CELL_WIDTH_CLASS[colSpan],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  )
}
