import type { ExportColumn } from "../../shared/csv.js"
import { formatEasternDateTime, formatStableDate } from "../../shared/date-format.js"
import type { WorkOrderListRow } from "./types.js"

/**
 * The CSV export manifest for work-order list rows — the single source of truth
 * for both the client column-picker checkboxes (`{ key, label }`) and the
 * server-side serialization (`value`). `scheduledFor` is a `@db.Date`, rendered
 * UTC-stable; operational timestamps render Eastern wall-clock to match the list.
 * The trailing `createdBy`/`updatedBy` columns carry the actor-email snapshots
 * alongside the timestamps (mirroring the adjustments export); null → "".
 */
export const WORK_ORDER_EXPORT_COLUMNS: ReadonlyArray<ExportColumn<WorkOrderListRow>> = [
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
  { key: "jobTypeName", label: "Job Type", value: (row) => row.jobTypeName ?? "" },
  { key: "vacancy", label: "Vacancy", value: (row) => row.vacancy ?? "" },
  { key: "unitNumber", label: "Unit #", value: (row) => row.unitNumber },
  { key: "unitType", label: "Unit Type", value: (row) => row.unitType },
  { key: "description", label: "Description", value: (row) => row.description },
  { key: "purchaseOrderNumber", label: "PO #", value: (row) => row.purchaseOrderNumber },
  { key: "createdAt", label: "Created", value: (row) => formatEasternDateTime(row.createdAt) },
  { key: "updatedAt", label: "Updated", value: (row) => formatEasternDateTime(row.updatedAt) },
  { key: "createdBy", label: "Created by", value: (row) => row.createdBy ?? "" },
  { key: "updatedBy", label: "Updated by", value: (row) => row.updatedBy ?? "" },
]
