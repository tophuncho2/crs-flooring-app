"use client"

import type { ReactNode } from "react"

export type FilterColumnProps = {
  children: ReactNode
  className?: string
}

/**
 * Vertical stack inside a `FilterToolbar`. Use to group two related chips
 * into a single horizontal slot — e.g. warehouse over location, category
 * over product. Mirrors the toolbar's `gap-2` rhythm so stacked chips
 * breathe at the same scale as adjacent ones.
 */
export function FilterColumn({ children, className }: FilterColumnProps) {
  return (
    <div
      className={["flex flex-col gap-2", className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  )
}
