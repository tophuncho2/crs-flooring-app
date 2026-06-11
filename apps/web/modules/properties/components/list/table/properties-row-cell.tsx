import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { formatPhoneNumber, type PropertyListRow } from "@builders/domain"

/**
 * Per-cell renderer for the properties list `DataTable`. Switches on
 * `column.key` and returns the cell body for that field on the given
 * row. Wired into `<DataTable renderCell={renderPropertyRowCell} />`.
 */
export function renderPropertyRowCell(
  column: DataTableColumn<PropertyListRow>,
  row: PropertyListRow,
): ReactNode {
  switch (column.key) {
    case "name":
      return <span className="font-medium">{row.name}</span>
    case "managementCompany":
      return row.managementCompany?.name ?? "-"
    case "streetAddress":
      return row.streetAddress || "-"
    case "city":
      return row.city || "-"
    case "state":
      return row.state || "-"
    case "zip":
      return row.zip || "-"
    case "phone":
      return <span>{formatPhoneNumber(row.phone) || "—"}</span>
    case "email":
      return row.email || "-"
    case "templateCount":
      return <span className="tabular-nums">{row.templateCount}</span>
    default:
      return "-"
  }
}
