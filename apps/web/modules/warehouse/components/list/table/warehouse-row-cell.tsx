import type { ReactNode } from "react"
import type { DataTableColumn } from "@/components/data-table"
import type { WarehouseRecord } from "@builders/db"

export function renderWarehouseRowCell(
  column: DataTableColumn<WarehouseRecord>,
  row: WarehouseRecord,
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
