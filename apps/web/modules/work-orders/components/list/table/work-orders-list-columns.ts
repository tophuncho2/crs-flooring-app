import type { DataTableColumn, SortMenuOption } from "@/engines/list-view"
import type { WorkOrderListRow } from "@builders/domain"

/**
 * Column definitions for the work-orders list-view `DataTable`. Order is
 * the visual left-to-right order. Track widths are computed by the
 * browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 *
 * Sortable headers (server-side): Date (`scheduledFor`), Time of Day, Warehouse,
 * Entity, Property, Job Type, Created, Updated. WO # (`workOrderNumber`) is
 * intentionally NOT sortable — `createdAt` is the canonical chronological key.
 * The client maps these column keys to backend sort fields (`entityName`→`entity`,
 * `propertyName`→`property`, `warehouseName`→`warehouse`, `jobTypeName`→`jobType`)
 * — see `work-orders-client.tsx`.
 */
export const WORK_ORDERS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<WorkOrderListRow>> = [
  { key: "workOrderNumber", label: "WO #" },
  { key: "scheduledFor", label: "Date", sortable: true },
  { key: "timeOfDay", label: "Time of Day", sortable: true },
  { key: "warehouseName", label: "Warehouse", sortable: true },
  { key: "entityName", label: "Entity", sortable: true },
  { key: "propertyName", label: "Property", sortable: true },
  { key: "jobTypeName", label: "Job Type", sortable: true },
  { key: "vacancy", label: "Vacancy" },
  { key: "unitNumber", label: "Unit #" },
  { key: "unitType", label: "Unit Type" },
  { key: "description", label: "Description" },
  { key: "createdAt", label: "Created", sortable: true },
  { key: "updatedAt", label: "Updated", sortable: true },
]

/**
 * Columns offered by the toolbar Sort menu — keyed by backend sort field (what
 * lands in `sorts`), labelled to match the headers. `type` drives the direction
 * control's labels (A→Z / Newest / AM first). Single source of truth: the
 * allowlist is derived from these keys, so the menu and the client allowlist can
 * never drift.
 */
export const WORK_ORDERS_SORT_OPTIONS = [
  { key: "scheduledFor", label: "Date", type: "date" },
  { key: "timeOfDay", label: "Time of Day", type: "time" },
  { key: "property", label: "Property", type: "text" },
  { key: "entity", label: "Entity", type: "text" },
  { key: "warehouse", label: "Warehouse", type: "text" },
  { key: "jobType", label: "Job Type", type: "text" },
  { key: "createdAt", label: "Created", type: "date" },
  { key: "updatedAt", label: "Updated", type: "date" },
] as const satisfies ReadonlyArray<SortMenuOption>

/** Backend sort fields the menu + header carets may emit (derived from the menu). */
export const WORK_ORDERS_ALLOWED_SORT_FIELDS = WORK_ORDERS_SORT_OPTIONS.map(
  (option) => option.key,
)

/** Max simultaneous sort columns — mirrors the engine + request + API + use case. */
export const WORK_ORDERS_MAX_SORT_LEVELS = 3
