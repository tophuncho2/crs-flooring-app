"use client"

import type { PropertyHubViewSidePanelController } from "@/modules/properties/controllers/property-hub-view-side-panel"

export function PropertyHubViewSidePanelTemplatesNextPageButton({
  controller,
}: {
  controller: PropertyHubViewSidePanelController
}) {
  const { templates } = controller
  return (
    <button
      type="button"
      onClick={templates.goNext}
      disabled={!templates.canNext}
      className="rounded border border-[var(--panel-border)] px-2 py-1 text-xs text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] disabled:opacity-50"
    >
      Next
    </button>
  )
}
