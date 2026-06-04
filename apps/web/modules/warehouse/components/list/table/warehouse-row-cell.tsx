import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import type { WarehouseListRow } from "@builders/domain"

export function renderWarehouseRowCell(
  column: DataTableColumn<WarehouseListRow>,
  row: WarehouseListRow,
): ReactNode {
  switch (column.key) {
    case "number":
      return <span className="tabular-nums">{row.number}</span>
    case "name":
      return <span className="font-medium">{row.name}</span>
    case "streetAddress":
      return row.streetAddress || "-"
    case "city":
      return row.city || "-"
    case "state":
      return row.state || "-"
    case "postalCode":
      return row.postalCode || "-"
    case "phone":
      return row.phone || "-"
    case "workOrdersCount":
      return <span className="tabular-nums">{row.workOrdersCount}</span>
    default:
      return "-"
  }
}
