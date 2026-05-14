"use client"

import type { ReactNode } from "react"

export type ListToolbarLeadProps = {
  children: ReactNode
  className?: string
}

/**
 * Left-most slot in a `ListToolbar`. Standardizes the width of the search
 * input across modules (`min-w-[16rem] max-w-[22rem] flex-1`) so the
 * toolbar reads the same regardless of which list view is rendered.
 */
export function ListToolbarLead({ children, className }: ListToolbarLeadProps) {
  return (
    <div
      className={["min-w-[16rem] max-w-[22rem] flex-1", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  )
}
