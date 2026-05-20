"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import type { PropertyHubViewActiveView } from "@/modules/properties/controllers/property-hub-view-side-panel"

const ARROW_BUTTON_CLASS_NAME =
  "flex h-7 w-7 items-center justify-center rounded text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] disabled:cursor-not-allowed disabled:opacity-40"

const VIEW_LABEL: Record<PropertyHubViewActiveView, string> = {
  properties: "Properties",
  templates: "Templates",
}

export function PropertyHubViewViewSwitcher({
  activeView,
  onGoToProperties,
  onGoToTemplates,
}: {
  activeView: PropertyHubViewActiveView
  onGoToProperties: () => void
  onGoToTemplates: () => void
}) {
  const atProperties = activeView === "properties"
  const atTemplates = activeView === "templates"

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-1">
      <button
        type="button"
        onClick={onGoToProperties}
        disabled={atProperties}
        aria-label="Show properties"
        className={ARROW_BUTTON_CLASS_NAME}
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/75">
        {VIEW_LABEL[activeView]}
      </span>
      <button
        type="button"
        onClick={onGoToTemplates}
        disabled={atTemplates}
        aria-label="Show templates"
        className={ARROW_BUTTON_CLASS_NAME}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
