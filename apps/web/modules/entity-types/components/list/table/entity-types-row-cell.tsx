import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { CellChip } from "@/engines/common"
import { formatEasternDateTime, type EntityTypeListRow } from "@builders/domain"

export function renderEntityTypeRowCell(
  column: DataTableColumn<EntityTypeListRow>,
  row: EntityTypeListRow,
): ReactNode {
  switch (column.key) {
    case "entityTypeNumber":
      return <span className="font-medium tabular-nums">{row.entityTypeNumber}</span>
    case "type":
      // Palette chip bound to the `type` cell — the non-semantic color tag.
      return <CellChip paletteColor={row.color}>{row.type}</CellChip>
    case "createdAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
      )
    case "updatedAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.updatedAt) || "—"}</span>
      )
    case "createdBy":
      return <span>{row.createdBy ?? "—"}</span>
    case "updatedBy":
      return <span>{row.updatedBy ?? "—"}</span>
    default:
      return "-"
  }
}
