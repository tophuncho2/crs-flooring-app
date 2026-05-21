"use client"

import {
  HubSidePanelScopedList,
  HubSidePanelScopedRow,
} from "@/components/hub-side-panel"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

const EMPTY_CELL = "—"

/**
 * Paginated properties under the active hub. Each row is clickable: clicking
 * triggers a transition to `section-edit-property` mode (the panel body
 * replaces this list with the property's edit cells). When the panel is in
 * MC edit mode this section renders dimmed (`disabled`) but still readable.
 */
export function PropertyHubPropertiesListSection({
  controller,
  dimmed = false,
}: {
  controller: PropertyHubSidePanelController
  dimmed?: boolean
}) {
  const { properties, enterPropertyEditFromContext } = controller
  const { hasData, isError, total, rows } = properties

  const list = (
    <HubSidePanelScopedList
      title="Properties"
      total={total}
      hasData={hasData}
      isError={isError}
      errorMessage="Could not load properties."
      loadingMessage="Loading properties…"
      emptyMessage={EMPTY_CELL}
    >
      {rows.map((row) => {
        const address = row.fullAddress.trim().length > 0 ? row.fullAddress : EMPTY_CELL
        const phone = row.phone.trim()
        return (
          <HubSidePanelScopedRow
            key={row.id}
            primary={row.name}
            secondary={address}
            meta={phone.length > 0 ? phone : null}
            onClick={() => enterPropertyEditFromContext(row)}
            ariaLabel={`Edit property ${row.name}`}
          />
        )
      })}
    </HubSidePanelScopedList>
  )

  if (dimmed) {
    return <div className="pointer-events-none opacity-50">{list}</div>
  }
  return list
}
