"use client"

import type { PropertyHubViewSidePanelController } from "@/modules/properties/controllers/property-hub-view-side-panel"

export function PropertyHubViewSidePanelNextPageButton({
  controller,
}: {
  controller: PropertyHubViewSidePanelController
}) {
  const { properties } = controller
  return (
    <button
      type="button"
      onClick={properties.goNext}
      disabled={!properties.canNext}
      className="rounded border border-[var(--panel-border)] px-2 py-1 text-xs text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"
    >
      Next
    </button>
  )
}
