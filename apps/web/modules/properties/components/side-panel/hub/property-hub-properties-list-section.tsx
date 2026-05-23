"use client"

import { ArrowRight } from "lucide-react"
import {
  HubSidePanelScopedList,
  HubSidePanelScopedRow,
} from "@/components/hub-side-panel"
import type { PropertyHubSidePanelController } from "@/modules/properties/controllers/property-hub-side-panel"

const EMPTY_CELL = "—"

const ROW_ACTION_BUTTON_CLASS =
  "inline-flex h-7 w-7 items-center justify-center rounded border border-blue-500/40 bg-[var(--background)] text-[var(--foreground)]/70 transition hover:bg-blue-500/10 hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"

/**
 * Paginated properties under the active hub. Each row is clickable: clicking
 * triggers a transition to `section-edit-property` mode (the panel body
 * replaces this list with the property's edit cells). A hover-revealed arrow
 * on the right jumps to the templates tab pre-filtered to that property. When
 * the panel is in MC edit mode this section renders dimmed (`disabled`) but
 * still readable, and the shortcut is omitted.
 */
export function PropertyHubPropertiesListSection({
  controller,
  dimmed = false,
}: {
  controller: PropertyHubSidePanelController
  dimmed?: boolean
}) {
  const { properties, enterPropertyEditFromContext, openTemplatesForProperty } = controller
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
        return (
          <HubSidePanelScopedRow
            key={row.id}
            primary={row.name}
            secondary={address}
            onClick={() => enterPropertyEditFromContext(row)}
            ariaLabel={`Edit property ${row.name}`}
            action={
              dimmed ? undefined : (
                <button
                  type="button"
                  aria-label={`View templates for ${row.name}`}
                  title={`View templates for ${row.name}`}
                  onClick={() => openTemplatesForProperty(row)}
                  className={ROW_ACTION_BUTTON_CLASS}
                >
                  <ArrowRight size={14} />
                </button>
              )
            }
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
