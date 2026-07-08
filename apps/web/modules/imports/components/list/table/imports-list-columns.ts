import type { DataTableColumn, SortMenuOption } from "@/engines/list-view"
import type { ImportRow } from "@builders/domain"

/**
 * Column definitions for the imports list-view `DataTable`. Order is the visual
 * left-to-right order. Sorting is driven by the toolbar Sort menu (see
 * IMPORTS_SORT_OPTIONS), not the column header — headers are static labels.
 */
export const IMPORTS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<ImportRow>> = [
  { key: "importNumber", label: "Import #" },
  { key: "warehouseName", label: "Warehouse" },
  { key: "entityName", label: "Entity" },
  { key: "purchaseOrderNumber", label: "Purchase Order #" },
  { key: "stagedInventoryRowsCount", label: "Staged", align: "end" },
  { key: "liveInventoryRowsCount", label: "Live", align: "end" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
]

/**
 * Columns offered by the toolbar Sort menu — keyed by backend sort field (what
 * lands in `sorts`), labelled to match the headers. `type` drives the direction
 * control's labels (Oldest/Newest for dates). Single source of truth: the
 * allowlist is derived from these keys, so the menu and the client allowlist can
 * never drift. Row# (Import #) and the warehouse/entity relation sorts are
 * intentionally NOT here — this pass scopes to the two timestamp columns; the
 * warehouse relation sort lands in a separate sweep.
 */
export const IMPORTS_SORT_OPTIONS = [
  { key: "createdAt", label: "Created", type: "date" },
  { key: "updatedAt", label: "Updated", type: "date" },
] as const satisfies ReadonlyArray<SortMenuOption>

/** Backend sort fields the Sort menu may emit (derived from the menu). */
export const IMPORTS_ALLOWED_SORT_FIELDS = IMPORTS_SORT_OPTIONS.map(
  (option) => option.key,
)

/** Max simultaneous sort columns — mirrors the engine + request + API + use case. */
export const IMPORTS_MAX_SORT_LEVELS = 3
