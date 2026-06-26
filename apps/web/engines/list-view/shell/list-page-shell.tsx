"use client"

import type { ReactNode } from "react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type ListPageShellProps = {
  children: ReactNode
  /** Extra classes for the inner `mx-4` content gutter. */
  className?: string
}

/**
 * The outer page frame shared by every list view: full-height background, the
 * header-strip top padding, and the `mx-4` content gutter. Consumers place the
 * `ListCreateButtonPortal`, `ListPageFeedback`, `ListActionBar`, and the table
 * inside as children — the portaled chrome relocates into the header regardless
 * of its position here. Caged so the wrapper stops being copy-pasted per module.
 */
export function ListPageShell({ children, className }: ListPageShellProps) {
  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className={joinClassNames("mx-4", className)}>{children}</div>
    </div>
  )
}
