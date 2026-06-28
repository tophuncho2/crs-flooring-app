import type { ReactNode } from "react"
import { CellChip } from "@/engines/common"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, formatStableDate, type WorkOrderListRow } from "@builders/domain"

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
      return <CellChip paletteColor={row.color}>{row.workOrderNumber}</CellChip>
    case "scheduledFor":
      return row.scheduledFor ? formatStableDate(row.scheduledFor) : "-"
    case "timeOfDay":
      return row.timeOfDay ?? "-"
    case "warehouseName":
      return row.warehouseName || "-"
    case "description":
      return row.description || "-"
    case "propertyName":
      return row.propertyName || "-"
    case "entityName":
      return row.entityName || "-"
    case "jobTypeName":
      return row.jobTypeName || "-"
    case "vacancy":
      return row.vacancy ?? "-"
    case "unitNumber":
      return row.unitNumber || "-"
    case "unitType":
      return row.unitType || "-"
    case "purchaseOrderNumber":
      return row.purchaseOrderNumber || "-"
    case "createdAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
    case "updatedAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.updatedAt) || "—"}</span>
    case "createdBy":
      return row.createdBy ?? "—"
    case "updatedBy":
      return row.updatedBy ?? "—"
    default:
      return "-"
  }
}
