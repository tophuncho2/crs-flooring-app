"use client"

import type { PropertyHubViewSidePanelController } from "@/modules/properties/controllers/property-hub-view-side-panel"

export function PropertyHubViewSidePanelPrevPageButton({
  controller,
}: {
  controller: PropertyHubViewSidePanelController
}) {
  const { properties } = controller
  return (
    <button
      type="button"
      onClick={properties.goPrev}
      disabled={!properties.canPrev}
      className="rounded border border-[var(--panel-border)] px-2 py-1 text-xs text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"
    >
      Prev
    </button>
  )
}
