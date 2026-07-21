import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { CellChip } from "@/engines/common"
import { formatEasternDateTime, formatPhoneNumber, type EntityListRow } from "@builders/domain"

/**
 * Per-cell renderer for the entities list `DataTable`. Switches
 * on `column.key` and returns the cell body for that field on the given row.
 * Wired into `<DataTable renderCell={renderEntityRowCell} />`.
 */
export function renderEntityRowCell(
  column: DataTableColumn<EntityListRow>,
  row: EntityListRow,
): ReactNode {
  switch (column.key) {
    case "entityNumber":
      return <CellChip paletteColor={row.color}>{row.entityNumber}</CellChip>
    case "entity":
      return <span className="font-medium">{row.entity}</span>
    case "types":
      return row.type ? (
        <CellChip paletteColor={row.type.color}>{row.type.type}</CellChip>
      ) : (
        "-"
      )
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
    case "propertyCount":
      return <span className="tabular-nums">{row.propertyCount}</span>
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
