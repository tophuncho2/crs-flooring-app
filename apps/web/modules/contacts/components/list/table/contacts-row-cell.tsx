import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { formatEasternDateTime, formatPhoneNumber, type ContactListRow } from "@builders/domain"

export function renderContactRowCell(
  column: DataTableColumn<ContactListRow>,
  row: ContactListRow,
): ReactNode {
  switch (column.key) {
    case "name":
      return <span className="font-medium">{row.name}</span>
    case "phone":
      return <span>{formatPhoneNumber(row.phone) || "—"}</span>
    case "email":
      return <span>{row.email || "—"}</span>
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
