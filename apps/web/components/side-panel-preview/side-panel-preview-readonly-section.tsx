"use client"

import type { ReactNode } from "react"

export type SidePanelPreviewReadonlySectionProps = {
  children: ReactNode
}

/**
 * Bordered card used inside a {@link SidePanelPreview}'s scrolling body to
 * group read-only summary content. Matches the chrome of the template-sync
 * preview header (rounded panel border, faint background fill, consistent
 * inner padding + vertical rhythm).
 *
 * Pure layout — no rows of its own. Compose with
 * {@link SidePanelPreviewReadonlyRow} for label / value pairs.
 */
export function SidePanelPreviewReadonlySection({
  children,
}: SidePanelPreviewReadonlySectionProps) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)]/40 p-3">
      {children}
    </div>
  )
}
