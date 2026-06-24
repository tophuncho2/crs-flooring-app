"use client"

import type { ReactNode } from "react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type RecordColumnBreakProps = {
  left: ReactNode
  right: ReactNode
  className?: string
}

/**
 * A vertical page break for record-view sections. Places `left` and `right` in
 * two **independent** grids flanking a visible vertical rule, so a tall cell on
 * one side never drags the row spacing of the other (a single shared
 * `FieldSection` grid would couple their rows). Each side typically holds its
 * own `FieldSection`.
 *
 * Collapses to a single column with the rule hidden below `md`. Grid items
 * stretch by default, so the rule spans the full height of the taller column.
 */
export function RecordColumnBreak({ left, right, className }: RecordColumnBreakProps) {
  return (
    <div className={joinClassNames("grid grid-cols-1 gap-6 md:grid-cols-2", className)}>
      <div className="min-w-0">{left}</div>
      <div className="min-w-0 md:border-l md:border-[var(--panel-border)] md:pl-6">{right}</div>
    </div>
  )
}
