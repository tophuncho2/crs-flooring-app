import type { DataTableColumn, SortMenuOption } from "@/engines/list-view"
import type { TemplateListRow } from "@builders/domain"

/**
 * Column definitions for the templates list-view `DataTable`. Order is
 * the visual left-to-right order. Track widths are computed by the
 * browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 *
 * Sorting is driven by the toolbar Sort menu (see TEMPLATES_SORT_OPTIONS), not
 * the column header — headers are static labels.
 */
export const TEMPLATES_LIST_COLUMNS: ReadonlyArray<DataTableColumn<TemplateListRow>> = [
  { key: "templateNumber", label: "Template #" },
  { key: "unitType", label: "Unit Type" },
  { key: "property", label: "Property" },
  { key: "entity", label: "Entity" },
  { key: "jobType", label: "Job Type" },
  { key: "warehouse", label: "Warehouse" },
  { key: "description", label: "Description" },
  { key: "items", label: "Items", align: "end" },
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
 * Row# (Template #) is intentionally NOT sortable — `createdAt` is the canonical
 * time key.
 */
export const TEMPLATES_SORT_OPTIONS = [
  { key: "property", label: "Property", type: "text" },
  { key: "entity", label: "Entity", type: "text" },
  { key: "unitType", label: "Unit Type", type: "text" },
  { key: "createdAt", label: "Created", type: "date" },
  { key: "updatedAt", label: "Updated", type: "date" },
] as const satisfies ReadonlyArray<SortMenuOption>

/** Backend sort fields the Sort menu may emit (derived from the menu). */
export const TEMPLATES_ALLOWED_SORT_FIELDS = TEMPLATES_SORT_OPTIONS.map(
  (option) => option.key,
)

/** Max simultaneous sort columns — mirrors the engine + request + API + use case. */
export const TEMPLATES_MAX_SORT_LEVELS = 3
