import type { ReactNode } from "react"
import type { DataTableColumn } from "@/components/data-table"
import type { ManagementCompanyListRow } from "@builders/domain"

/**
 * Per-cell renderer for the management-companies list `DataTable`. Switches
 * on `column.key` and returns the cell body for that field on the given row.
 * Wired into `<DataTable renderCell={renderManagementCompanyRowCell} />`.
 */
export function renderManagementCompanyRowCell(
  column: DataTableColumn<ManagementCompanyListRow>,
  row: ManagementCompanyListRow,
): ReactNode {
  switch (column.key) {
    case "name":
      return <span className="font-medium">{row.name}</span>
    case "streetAddress":
      return row.streetAddress || "-"
    case "city":
      return row.city || "-"
    case "state":
      return row.state || "-"
    case "zip":
      return row.zip || "-"
    case "phone":
      return row.phone || "-"
    case "email":
      return row.email || "-"
    case "propertyCount":
      return <span className="tabular-nums">{row.propertyCount}</span>
    default:
      return "-"
  }
}
