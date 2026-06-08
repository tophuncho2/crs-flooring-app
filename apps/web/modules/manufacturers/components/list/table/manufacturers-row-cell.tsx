import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, type ManufacturerListRow } from "@builders/domain"

export function renderManufacturerRowCell(
  column: DataTableColumn<ManufacturerListRow>,
  row: ManufacturerListRow,
): ReactNode {
  switch (column.key) {
    case "companyName":
      return <span className="font-medium text-blue-500">{row.companyName || "-"}</span>
    case "agentName":
      return row.agentName || "-"
    case "phone":
      return row.phone || "-"
    case "email":
      return row.email || "-"
    case "productsCount":
      return <span className="tabular-nums">{row.productsCount}</span>
    case "createdAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
      )
    case "updatedAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.updatedAt) || "—"}</span>
      )
    default:
      return "-"
  }
}
