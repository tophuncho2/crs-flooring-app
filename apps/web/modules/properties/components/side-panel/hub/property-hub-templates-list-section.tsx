"use client"

import { formatTemplateItemsCount, type TemplateListRow } from "@builders/domain"
import {
  HubSidePanelRowOpenButton,
  HubSidePanelScopedRow,
  HubSidePanelScrollList,
} from "@/components/hub-side-panel"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

const EMPTY_CELL = "—"

/**
 * Paginated templates under the active hub, optionally filtered by a single
 * property. Clicking a row routes to the consumer (→ the sync panel); the
 * trailing arrow opens the template record directly. Both behaviors are the
 * panel's concern, passed in as handlers.
 */
export function PropertyHubTemplatesListSection({
  controller,
  onOpenTemplate,
  onOpenTemplateRecord,
}: {
  controller: PropertyHubSidePanelController
  onOpenTemplate: (row: TemplateListRow) => void
  onOpenTemplateRecord: (row: TemplateListRow) => void
}) {
  const { templates } = controller
  const { hasData, isError, total, rows, hasMore, isFetchingMore, loadMore } = templates

  return (
    <HubSidePanelScrollList
      title="Templates"
      count={total}
      hasData={hasData}
      isEmpty={total === 0}
      isError={isError}
      errorMessage="Could not load templates."
      loadingMessage="Loading templates…"
      emptyMessage={EMPTY_CELL}
      hasMore={hasMore}
      isFetchingMore={isFetchingMore}
      onLoadMore={loadMore}
    >
      {rows.map((row) => {
        const unitType = row.unitType.trim().length > 0 ? row.unitType : EMPTY_CELL
        const secondaryLines = [row.jobTypeName, row.description].filter(
          (value): value is string => Boolean(value && value.trim().length > 0),
        )
        return (
          <HubSidePanelScopedRow
            key={row.id}
            primary={unitType}
            secondaryLines={secondaryLines}
            meta={formatTemplateItemsCount(row.itemsCount)}
            onClick={() => onOpenTemplate(row)}
            ariaLabel={`Open template ${unitType}`}
            action={
              <HubSidePanelRowOpenButton
                onClick={() => onOpenTemplateRecord(row)}
                ariaLabel={`Open template record ${unitType}`}
              />
            }
          />
        )
      })}
    </HubSidePanelScrollList>
  )
}
