"use client"

import type { ReactNode } from "react"

export type HubSidePanelEditLayoutProps = {
  /** Action toolbar (edit toolbar / action button row) — pinned on top. */
  toolbar?: ReactNode
  /** Contextual controls below the toolbar: picker triggers, relink header, sub-header. */
  children?: ReactNode
}

/**
 * Stacks an edit/create action toolbar above its contextual controls inside
 * the hub panel's sticky top header. Owns the canonical order (toolbar first)
 * and gap so every hub edit panel stays uniform with the read-only view, which
 * pins its controls at the top. A null `toolbar` (e.g. while a picker takeover
 * is active) collapses cleanly with no stray gap.
 */
export function HubSidePanelEditLayout({
  toolbar,
  children,
}: HubSidePanelEditLayoutProps) {
  return (
    <div className="flex flex-col gap-3">
      {toolbar}
      {children}
    </div>
  )
}
