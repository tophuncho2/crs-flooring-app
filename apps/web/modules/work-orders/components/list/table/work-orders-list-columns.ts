import type { DataTableColumn } from "@/engines/list-view"
import type { WorkOrderListRow } from "@builders/domain"

/**
 * Column definitions for the work-orders list-view `DataTable`. Order is
 * the visual left-to-right order. Track widths are computed by the
 * browser (`table-layout: auto`) — each column sizes to
 * `max(header label, widest cell)` and never wraps.
 */
export const WORK_ORDERS_LIST_COLUMNS: ReadonlyArray<DataTableColumn<WorkOrderListRow>> = [
  { key: "workOrderNumber", label: "WO #" },
  { key: "scheduledFor", label: "Date" },
  { key: "timeOfDay", label: "Time of Day" },
  { key: "warehouseName", label: "Warehouse" },
  { key: "managementCompanyName", label: "Management Company" },
  { key: "propertyName", label: "Property" },
  { key: "jobTypeName", label: "Job Type" },
  { key: "vacancy", label: "Vacancy" },
  { key: "unitNumber", label: "Unit #" },
  { key: "unitType", label: "Unit Type" },
  { key: "description", label: "Description" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
]
