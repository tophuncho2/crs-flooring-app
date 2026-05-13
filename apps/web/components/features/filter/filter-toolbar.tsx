"use client"

import type { ReactNode } from "react"

export type FilterToolbarProps = {
  children: ReactNode
  className?: string
}

export function FilterToolbar({ children, className }: FilterToolbarProps) {
  return (
    <div
      className={[
        "flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] px-4 py-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  )
}
