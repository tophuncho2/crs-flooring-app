"use client"

import type { TemplateListRow } from "@builders/domain"
import { SidePanelPreviewSection } from "@/components/side-panel-preview"
import type { PropertyHubViewSidePanelController } from "@/modules/properties/controllers/property-hub-view-side-panel"
import { PropertyHubViewTemplateRow } from "./property-hub-view-template-row"

const GRID_BORDER = "border-blue-500/40"
const EMPTY_CELL = "—"

export function PropertyHubViewTemplatesSection({
  controller,
  onOpenTemplate,
}: {
  controller: PropertyHubViewSidePanelController
  onOpenTemplate: (row: TemplateListRow) => void
}) {
  const { templates } = controller
  const { hasData, isError, total, rows } = templates

  if (!hasData) {
    return (
      <SidePanelPreviewSection title="Templates">
        <p className="text-xs text-[var(--foreground)]/55">
          {isError ? "Could not load templates." : "Loading templates…"}
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
          Templates ({total})
        </span>
      </div>
      <div className={`overflow-hidden rounded-md rounded-tl-none border ${GRID_BORDER}`}>
        {rows.length === 0 ? (
          <div className="px-3 py-2 text-xs text-[var(--foreground)]/55">{EMPTY_CELL}</div>
        ) : (
          rows.map((row) => (
            <PropertyHubViewTemplateRow key={row.id} row={row} onClick={onOpenTemplate} />
          ))
        )}
      </div>
    </div>
  )
}
