"use client"

import type { PropertyHubViewSidePanelController } from "@/modules/properties/controllers/property-hub-view-side-panel"

export function PropertyHubViewSidePanelPageIndicator({
  controller,
}: {
  controller: PropertyHubViewSidePanelController
}) {
  const { properties } = controller
  return (
    <span className="tabular-nums text-xs text-[var(--foreground)]/55">
      Page {properties.page} of {properties.totalPages} · {properties.total} properties
    </span>
  )
}
