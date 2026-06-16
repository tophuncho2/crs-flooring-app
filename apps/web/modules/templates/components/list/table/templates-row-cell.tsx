import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import type { TemplateListRow } from "@builders/domain"

/**
 * Per-cell renderer for the templates list `DataTable`. Switches on
 * `column.key` and returns the cell body for that field on the given
 * row. Wired into `<DataTable renderCell={renderTemplateRowCell} />`.
 */
export function renderTemplateRowCell(
  column: DataTableColumn<TemplateListRow>,
  row: TemplateListRow,
): ReactNode {
  switch (column.key) {
    case "unitType":
      return row.unitType || "-"
    case "property":
      return row.propertyName || "-"
    case "managementCompany":
      return row.managementCompanyName || "-"
    case "jobType":
      return row.jobTypeName || "-"
    case "warehouse":
      return row.warehouseName || "-"
    case "description":
      return row.description || "-"
    case "items":
      return <span className="tabular-nums">{row.itemsCount}</span>
    case "templateNumber":
      return <span className="font-medium">{row.templateNumber}</span>
    default:
      return "-"
  }
}
