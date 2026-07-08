"use client"

import type { ReactNode } from "react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type ListPageShellProps = {
  children: ReactNode
  /** Extra classes for the inner content gutter. */
  className?: string
  /**
   * Bounded, full-height layout. When true the page itself does NOT scroll:
   * the frame is a viewport-height flex column, so a `fill` {@link DataTable}
   * child grows to the bottom of the viewport and scrolls internally (sticky
   * header + pinned footer). The top pad matches the fixed app-shell header
   * strip so the sticky column headers pin right beneath the action bar, and
   * the side gutter is slimmed to near edge-to-edge so the table fills its gap.
   * Off (default) keeps the legacy document-flow frame (`min-h-screen` + `mx-4`).
   */
  fill?: boolean
}

/**
 * The outer page frame shared by every list view: full-height background, the
 * header-strip top padding, and the content gutter. Consumers place the
 * `ListCreateButtonPortal`, `ListPageFeedback`, `ListActionBar`, and the table
 * inside as children — the portaled chrome relocates into the header regardless
 * of its position here. Caged so the wrapper stops being copy-pasted per module.
 */
export function ListPageShell({ children, className, fill = false }: ListPageShellProps) {
  if (fill) {
    // No side/bottom gutter: the table card runs edge-to-edge (flush against the
    // nav-rail on the left and the viewport on the right/bottom). Only the top
    // pad remains, matched to the fixed header strip so the sticky column headers
    // pin right beneath the action bar.
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--background)] px-0 pb-0 pt-24 text-[var(--foreground)] sm:pt-28">
        <div className={joinClassNames("flex min-h-0 flex-1 flex-col gap-2", className)}>
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className={joinClassNames("mx-4", className)}>{children}</div>
    </div>
  )
}
