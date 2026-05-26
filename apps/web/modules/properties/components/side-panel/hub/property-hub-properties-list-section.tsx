"use client"

import {
  HubSidePanelRowOpenButton,
  HubSidePanelScopedRow,
  HubSidePanelScrollList,
} from "@/components/hub-side-panel"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

const EMPTY_CELL = "—"

/**
 * Paginated properties under the active hub. Each row is clickable: clicking
 * triggers a transition to `section-edit-property` mode (the panel body
 * replaces this list with the property's edit cells). A hover-revealed arrow
 * on the right jumps to the templates tab pre-filtered to that property. The
 * list renders and behaves identically in the read-only hub view and in
 * MC-edit mode.
 */
export function PropertyHubPropertiesListSection({
  controller,
}: {
  controller: PropertyHubSidePanelController
}) {
  const { properties, enterPropertyEditFromContext, openTemplatesForProperty } = controller
  const { hasData, isError, total, rows, hasMore, isFetchingMore, loadMore } = properties

  return (
    <HubSidePanelScrollList
      title="Properties"
      hasData={hasData}
      isEmpty={total === 0}
      isError={isError}
      errorMessage="Could not load properties."
      loadingMessage="Loading properties…"
      emptyMessage={EMPTY_CELL}
      hasMore={hasMore}
      isFetchingMore={isFetchingMore}
      onLoadMore={loadMore}
    >
      {rows.map((row) => {
        const address = row.fullAddress.trim().length > 0 ? row.fullAddress : EMPTY_CELL
        return (
          <HubSidePanelScopedRow
            key={row.id}
            primary={row.name}
            secondary={address}
            onClick={() => enterPropertyEditFromContext(row)}
            ariaLabel={`Edit property ${row.name}`}
            action={
              <HubSidePanelRowOpenButton
                onClick={() => openTemplatesForProperty(row)}
                ariaLabel={`View templates for ${row.name}`}
              />
            }
          />
        )
      })}
    </HubSidePanelScrollList>
  )
}
