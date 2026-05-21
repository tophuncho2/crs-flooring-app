"use client"

import type { TemplateListRow } from "@builders/domain"
import {
  HubSidePanelScopedList,
  HubSidePanelScopedRow,
} from "@/components/hub-side-panel"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

const EMPTY_CELL = "—"

/**
 * Paginated templates under the active hub, optionally filtered by a single
 * property. Row clicks are routed to the consumer (the hub panel
 * orchestrator) so the row → navigation behavior stays the panel's concern.
 */
export function PropertyHubTemplatesListSection({
  controller,
  onOpenTemplate,
}: {
  controller: PropertyHubSidePanelController
  onOpenTemplate: (row: TemplateListRow) => void
}) {
  const { templates } = controller
  const { hasData, isError, total, rows } = templates

  return (
    <HubSidePanelScopedList
      title="Templates"
      total={total}
      hasData={hasData}
      isError={isError}
      errorMessage="Could not load templates."
      loadingMessage="Loading templates…"
      emptyMessage={EMPTY_CELL}
    >
      {rows.map((row) => {
        const unitType = row.unitType.trim().length > 0 ? row.unitType : EMPTY_CELL
        const propertyName = row.propertyName.trim()
        const jobType = (row.jobTypeName ?? "").trim()
        const secondary = [propertyName, jobType].filter((value) => value.length > 0).join(" · ")
        const description = row.description.trim()
        const meta = `${row.itemsCount} ${row.itemsCount === 1 ? "item" : "items"}`
        return (
          <HubSidePanelScopedRow
            key={row.id}
            primary={unitType}
            secondary={secondary || description || null}
            meta={meta}
            onClick={() => onOpenTemplate(row)}
            ariaLabel={`Open template ${unitType}`}
          />
        )
      })}
    </HubSidePanelScopedList>
  )
}
