import type { DataTableColumn, SortMenuOption } from "@/engines/list-view"
import type { WorkOrderListRow } from "@builders/domain"

/**
 * Column definitions for the work-orders list-view `DataTable`. Order is
 * the visual left-to-right order. Track widths are computed by the
 * browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 *
 * Sorting is driven by the toolbar Sort menu (see WORK_ORDERS_SORT_OPTIONS), not
 * the column header — headers are static labels.
 */
export const WORK_ORDERS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<WorkOrderListRow>> = [
  { key: "workOrderNumber", label: "WO #" },
  { key: "scheduledFor", label: "Date" },
  { key: "timeOfDay", label: "Time of Day" },
  { key: "warehouseName", label: "Warehouse" },
  { key: "entityName", label: "Entity" },
  { key: "propertyName", label: "Property" },
  { key: "customerName", label: "Customer Name" },
  { key: "streetAddress", label: "Street" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "Zip" },
  { key: "jobTypeName", label: "Job Type" },
  { key: "vacancy", label: "Vacancy" },
  { key: "unitNumber", label: "Unit #" },
  { key: "unitType", label: "Unit Type" },
  { key: "description", label: "Description" },
  { key: "installer", label: "Installer" },
  { key: "purchaseOrderNumber", label: "PO #" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "createdBy", label: "Created by" },
  { key: "updatedBy", label: "Updated by" },
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

/** Backend sort fields the Sort menu may emit (derived from the menu). */
export const WORK_ORDERS_ALLOWED_SORT_FIELDS = WORK_ORDERS_SORT_OPTIONS.map(
  (option) => option.key,
)

/** Max simultaneous sort columns — mirrors the engine + request + API + use case. */
export const WORK_ORDERS_MAX_SORT_LEVELS = 3
