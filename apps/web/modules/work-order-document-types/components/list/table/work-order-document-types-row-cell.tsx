import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { CellChip } from "@/engines/common"
import { formatEasternDateTime, type WorkOrderDocumentTypeListRow } from "@builders/domain"

export function renderWorkOrderDocumentTypeRowCell(
  column: DataTableColumn<WorkOrderDocumentTypeListRow>,
  row: WorkOrderDocumentTypeListRow,
): ReactNode {
  switch (column.key) {
    case "workOrderDocumentTypeNumber":
      return (
        <span className="font-medium tabular-nums">{row.workOrderDocumentTypeNumber}</span>
      )
    case "name":
      // Palette chip wraps the `name` cell — the non-semantic color tag.
      return <CellChip paletteColor={row.color}>{row.name}</CellChip>
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
