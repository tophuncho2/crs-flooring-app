"use client"

import type { ReactNode } from "react"

export type ListToolbarTrailingProps = {
  children: ReactNode
  className?: string
}

/**
 * Right-aligned slot inside a `ListToolbar`. Pushed to the far edge
 * regardless of how much filter width sits to its left. By convention
 * hosts the clear-all button + row count.
 */
export function ListToolbarTrailing({
  children,
  className,
}: ListToolbarTrailingProps) {
  return (
    <div
      className={["ml-auto flex items-center gap-3", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  )
}
