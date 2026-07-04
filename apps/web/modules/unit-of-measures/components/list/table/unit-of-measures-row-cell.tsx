import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import {
  formatEasternDateTime,
  type UnitOfMeasureListRow,
} from "@builders/domain"

export function renderUnitOfMeasureRowCell(
  column: DataTableColumn<UnitOfMeasureListRow>,
  row: UnitOfMeasureListRow,
): ReactNode {
  switch (column.key) {
    case "name":
      return <span className="font-medium">{row.name}</span>
    case "abbreviation":
      return <span className="tabular-nums">{row.abbreviation}</span>
    case "createdAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
      )
    default:
      return "-"
  }
}
