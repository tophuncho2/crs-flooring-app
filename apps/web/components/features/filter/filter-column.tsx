"use client"

import type { ReactNode } from "react"

export type FilterColumnProps = {
  children: ReactNode
  className?: string
}

/**
 * Vertical stack inside a `ListToolbar` (or legacy `FilterToolbar`). Use
 * to group two related chips into a single horizontal slot — e.g.
 * warehouse over location, category over product. The `gap-3` matches the
 * toolbar's `gap-y-3` so stacked chips breathe at the same vertical
 * scale as wrapped rows of single chips.
 */
export function FilterColumn({ children, className }: FilterColumnProps) {
  return (
    <div
      className={["flex flex-col gap-3", className].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  )
}
