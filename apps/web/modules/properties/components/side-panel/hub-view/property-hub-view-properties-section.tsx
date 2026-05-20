"use client"

import type { PropertyListRow } from "@builders/domain"
import { SidePanelPreviewSection } from "@/components/side-panel-preview"
import type { PropertyHubViewSidePanelController } from "@/modules/properties/controllers/property-hub-view-side-panel"
import { PropertyHubViewPropertyRow } from "./property-hub-view-property-row"

const GRID_BORDER = "border-blue-500/40"
const EMPTY_CELL = "—"

export function PropertyHubViewPropertiesSection({
  controller,
  onOpenProperty,
}: {
  controller: PropertyHubViewSidePanelController
  onOpenProperty: (row: PropertyListRow) => void
}) {
  const { properties } = controller
  const { hasData, isError, total, rows } = properties

  if (!hasData) {
    return (
      <SidePanelPreviewSection title="Properties">
        <p className="text-xs text-[var(--foreground)]/55">
          {isError ? "Could not load properties." : "Loading properties…"}
        </p>
      </SidePanelPreviewSection>
    )
  }

  return (
    <div>
      <div>
        <span
          className={`inline-block rounded-t-md border border-b-0 ${GRID_BORDER} bg-blue-500/15 px-3 py-1 text-xs font-bold text-[var(--foreground)]/85`}
        >
          Properties ({total})
        </span>
      </div>
      <div className={`overflow-hidden rounded-md rounded-tl-none border ${GRID_BORDER}`}>
        {rows.length === 0 ? (
          <div className="px-3 py-2 text-xs text-[var(--foreground)]/55">{EMPTY_CELL}</div>
        ) : (
          rows.map((row) => (
            <PropertyHubViewPropertyRow key={row.id} row={row} onClick={onOpenProperty} />
          ))
        )}
      </div>
    </div>
  )
}
