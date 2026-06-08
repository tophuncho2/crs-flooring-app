"use client"

import type { CSSProperties, ReactNode } from "react"
import type { CellPlacement } from "./contracts/cell-placement"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type CellAtProps = CellPlacement & {
  children: ReactNode
  className?: string
}

/**
 * Place a child at a specific (col, row) coordinate inside a `LayoutGrid`.
 * `col` is required (1-indexed). Omit `row` to auto-flow into the next
 * available row. `colSpan` / `rowSpan` default to 1.
 *
 *   <LayoutGrid geometry={{ columns: 8 }}>
 *     <CellAt col={1} colSpan={4}>...</CellAt>
 *     <CellAt col={5} colSpan={4}>...</CellAt>
 *     <CellAt col={1} colSpan={8}>...</CellAt>
 *   </LayoutGrid>
 */
export function CellAt({
  col,
  row,
  colSpan = 1,
  rowSpan = 1,
  children,
  className,
}: CellAtProps) {
  const style: CSSProperties = {
    gridColumn: `${col} / span ${colSpan}`,
    ...(row !== undefined ? { gridRow: `${row} / span ${rowSpan}` } : {}),
  }

  return (
    <div style={style} className={joinClassNames("min-w-0", className)}>
      {children}
    </div>
  )
}
