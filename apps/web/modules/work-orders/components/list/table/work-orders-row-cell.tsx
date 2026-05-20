import type { ReactNode } from "react"
import type { DataTableColumn } from "@/components/data-table"
import { formatStableDate, type WorkOrderListRow } from "@builders/domain"

/**
 * Per-cell renderer for the work-orders list `DataTable`. Switches on
 * `column.key` and returns the cell body for that field on the given
 * row. Wired into `<DataTable renderCell={renderWorkOrderRowCell} />`.
 */
export function renderWorkOrderRowCell(
  column: DataTableColumn<WorkOrderListRow>,
  row: WorkOrderListRow,
): ReactNode {
  switch (column.key) {
    case "workOrderNumber":
      return <span className="font-medium">{row.workOrderNumber}</span>
    case "scheduledFor":
      return row.scheduledFor ? formatStableDate(row.scheduledFor) : "-"
    case "warehouseName":
      return row.warehouseName || "-"
    case "description":
      return row.description || "-"
    case "propertyName":
      return row.propertyName || "-"
    case "managementCompanyName":
      return row.managementCompanyName || "-"
    case "jobTypeName":
      return row.jobTypeName || "-"
    case "vacancy":
      return row.vacancy ?? "-"
    case "unitNumber":
      return row.unitNumber || "-"
    case "unitType":
      return row.unitType || "-"
    case "isComplete":
      return row.isComplete ? "Complete" : "—"
    default:
      return "-"
  }
}
