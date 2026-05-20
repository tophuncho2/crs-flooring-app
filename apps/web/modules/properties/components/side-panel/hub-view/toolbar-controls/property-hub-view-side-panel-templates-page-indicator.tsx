"use client"

import type { PropertyHubViewSidePanelController } from "@/modules/properties/controllers/property-hub-view-side-panel"

export function PropertyHubViewSidePanelTemplatesPageIndicator({
  controller,
}: {
  controller: PropertyHubViewSidePanelController
}) {
  const { templates } = controller
  return (
    <span className="tabular-nums text-xs text-[var(--foreground)]/55">
      Page {templates.page} of {templates.totalPages} · {templates.total} templates
    </span>
  )
}
