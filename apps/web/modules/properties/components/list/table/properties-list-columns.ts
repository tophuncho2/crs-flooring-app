import type { DataTableColumn, SortMenuOption } from "@/engines/list-view"
import type { PropertyListRow } from "@builders/domain"

/**
 * Column definitions for the properties list-view `DataTable`. Order is
 * the visual left-to-right order. Track widths are computed by the
 * browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 *
 * Sorting is driven by the toolbar Sort menu (see PROPERTIES_SORT_OPTIONS), not
 * the column header — headers are static labels.
 */
export const PROPERTIES_LIST_COLUMNS: ReadonlyArray<DataTableColumn<PropertyListRow>> = [
  { key: "propertyNumber", label: "PROP #" },
  { key: "name", label: "Property" },
  { key: "entity", label: "Entity" },
  { key: "streetAddress", label: "Street" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "Zip" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "templateCount", label: "Templates", align: "end" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]

/**
 * Columns offered by the toolbar Sort menu — keyed by backend sort field (what
 * lands in `sorts`), labelled to match the headers. `type` drives the direction
 * control's labels (A→Z / Newest). Single source of truth: the allowlist is
 * derived from these keys, so the menu and the client allowlist can never drift.
 * Row# (PROP #) is intentionally NOT sortable — `createdAt` is the canonical
 * time key.
 */
export const PROPERTIES_SORT_OPTIONS = [
  { key: "name", label: "Property", type: "text" },
  { key: "entity", label: "Entity", type: "text" },
  { key: "createdAt", label: "Created", type: "date" },
  { key: "updatedAt", label: "Updated", type: "date" },
] as const satisfies ReadonlyArray<SortMenuOption>

/** Backend sort fields the Sort menu may emit (derived from the menu). */
export const PROPERTIES_ALLOWED_SORT_FIELDS = PROPERTIES_SORT_OPTIONS.map(
  (option) => option.key,
)

/** Max simultaneous sort columns — mirrors the engine + request + API + use case. */
export const PROPERTIES_MAX_SORT_LEVELS = 3
