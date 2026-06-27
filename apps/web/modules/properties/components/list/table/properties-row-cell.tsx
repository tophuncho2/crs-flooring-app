import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { CellChip } from "@/engines/common"
import { formatEasternDateTime, formatPhoneNumber, type PropertyListRow } from "@builders/domain"

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
    case "propertyNumber":
      return <CellChip paletteColor={row.color}>{row.propertyNumber}</CellChip>
    case "entity":
      return row.entity?.entity ?? "-"
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
    case "createdAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
    case "updatedAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.updatedAt) || "—"}</span>
    case "createdBy":
      return <span>{row.createdBy ?? "—"}</span>
    case "updatedBy":
      return <span>{row.updatedBy ?? "—"}</span>
    default:
      return "-"
  }
}
