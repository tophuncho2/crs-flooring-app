"use client"

import type { ReactNode } from "react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

/**
 * The named flank ratios a module can pick for the break. `even` keeps the two
 * halves equal (the centered default); `right-narrow` weights the split ~70/30
 * so a slim right cell (e.g. a Types picker) sits in a ~30% column. The class
 * fragments are kept **literal** so Tailwind's JIT emits the arbitrary
 * `grid-cols-[…]` values — a runtime-computed fraction would be purged.
 */
const SPLIT_TEMPLATES = {
  even: "md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
  "right-narrow": "md:grid-cols-[minmax(0,7fr)_auto_minmax(0,3fr)]",
} as const

export type RecordColumnBreakSplit = keyof typeof SPLIT_TEMPLATES

export type RecordColumnBreakProps = {
  left: ReactNode
  right: ReactNode
  /** Flank ratio, per-module. Defaults to `even` (centered). */
  split?: RecordColumnBreakSplit
  className?: string
}

/**
 * A vertical page break for record-view sections. Places `left` and `right` in
 * two **independent** grids flanking a visible vertical rule, so a tall cell on
 * one side never drags the row spacing of the other (a single shared
 * `FieldSection` grid would couple their rows). Each side typically holds its
 * own `FieldSection`.
 *
 * The rule is its own `auto`-width middle column between the two halves with
 * symmetric gaps, so it sits exactly on the split boundary regardless of each
 * side's content width. The flank ratio is per-module via `split` — centered
 * (`even`) by default, or weighted (`right-narrow` ≈ 70/30). Grid items stretch
 * by default, so the rule spans the full height of the taller column. Collapses
 * to a single stacked column with the rule hidden below `md`.
 */
export function RecordColumnBreak({ left, right, split = "even", className }: RecordColumnBreakProps) {
  return (
    <div
      className={joinClassNames(
        "grid grid-cols-1 gap-6 md:gap-x-8",
        SPLIT_TEMPLATES[split],
        className,
      )}
    >
      <div className="min-w-0">{left}</div>
      <div aria-hidden className="hidden w-px self-stretch bg-[var(--panel-border)] md:block" />
      <div className="min-w-0">{right}</div>
    </div>
  )
}
