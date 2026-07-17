import type { ColumnCatalogEntry } from "../shared/csv.js"
import { formatEasternDateTime, formatStableDate } from "../shared/date-format.js"
import type { WorkOrderListRow } from "./types.js"

/**
 * The work-order column catalog — the single source of truth for BOTH the visible
 * list-view `DataTable` columns and the export (column-picker checkboxes + CSV/
 * Sheet). Order here is the visual left-to-right table order, and the export
 * follows it. Every column shows on both surfaces (no `exportOnly`/`listOnly`
 * flags today). `scheduledFor` is a `@db.Date`, rendered UTC-stable; operational
 * timestamps render Eastern wall-clock to match the list; the trailing
 * `createdBy`/`updatedBy` carry the actor-email snapshots (null → "").
 */
export const WORK_ORDER_COLUMNS: ReadonlyArray<ColumnCatalogEntry<WorkOrderListRow>> = [
  { key: "workOrderNumber", label: "WO #", value: (row) => row.workOrderNumber },
  {
    key: "scheduledFor",
    label: "Date",
    value: (row) => (row.scheduledFor ? formatStableDate(row.scheduledFor) : ""),
  },
  { key: "timeOfDay", label: "Time of Day", value: (row) => row.timeOfDay ?? "" },
  { key: "warehouseName", label: "Warehouse", value: (row) => row.warehouseName },
  { key: "entityName", label: "Entity", value: (row) => row.entityName ?? "" },
  { key: "propertyName", label: "Property", value: (row) => row.propertyName },
  { key: "customerName", label: "Customer Name", value: (row) => row.customerName },
  { key: "streetAddress", label: "Street", value: (row) => row.streetAddress },
  { key: "city", label: "City", value: (row) => row.city },
  { key: "state", label: "State", value: (row) => row.state },
  { key: "zip", label: "Zip", value: (row) => row.zip },
  { key: "jobTypeName", label: "Job Type", value: (row) => row.jobTypeName ?? "" },
  { key: "vacancy", label: "Vacancy", value: (row) => row.vacancy ?? "" },
  { key: "unitNumber", label: "Unit #", value: (row) => row.unitNumber },
  { key: "unitType", label: "Unit Type", value: (row) => row.unitType },
  { key: "description", label: "Description", value: (row) => row.description },
  { key: "installer", label: "Installer", value: (row) => row.installer },
  { key: "purchaseOrderNumber", label: "PO #", value: (row) => row.purchaseOrderNumber },
  { key: "return", label: "Return", value: (row) => row.return },
  { key: "createdAt", label: "Created", value: (row) => formatEasternDateTime(row.createdAt) },
  { key: "updatedAt", label: "Updated", value: (row) => formatEasternDateTime(row.updatedAt) },
  { key: "createdBy", label: "Created by", value: (row) => row.createdBy ?? "" },
  { key: "updatedBy", label: "Updated by", value: (row) => row.updatedBy ?? "" },
]
