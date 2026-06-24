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
 * two **independent**, equal-width grids flanking a visible vertical rule, so a
 * tall cell on one side never drags the row spacing of the other (a single
 * shared `FieldSection` grid would couple their rows). Each side typically holds
 * its own `FieldSection`.
 *
 * The rule is its own `auto`-width middle column between two `1fr` halves with
 * symmetric gaps, so it sits dead-center regardless of each side's content
 * width. Grid items stretch by default, so the rule spans the full height of the
 * taller column. Collapses to a single stacked column with the rule hidden
 * below `md`.
 */
export function RecordColumnBreak({ left, right, className }: RecordColumnBreakProps) {
  return (
    <div
      className={joinClassNames(
        "grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-x-8",
        className,
      )}
    >
      <div className="min-w-0">{left}</div>
      <div aria-hidden className="hidden w-px self-stretch bg-[var(--panel-border)] md:block" />
      <div className="min-w-0">{right}</div>
    </div>
  )
}
