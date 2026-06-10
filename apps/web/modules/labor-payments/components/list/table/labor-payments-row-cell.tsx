import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { formatCurrencyValue, formatEasternDateTime, type LaborPaymentListRow } from "@builders/domain"

export function renderLaborPaymentRowCell(
  column: DataTableColumn<LaborPaymentListRow>,
  row: LaborPaymentListRow,
): ReactNode {
  switch (column.key) {
    case "contactName":
      return <span className="font-medium">{row.contactName || "—"}</span>
    case "unit":
      return <span>{row.unit || "—"}</span>
    case "description":
      return <span>{row.description || "—"}</span>
    case "cost":
      return (
        <span className="tabular-nums">{row.cost ? formatCurrencyValue(row.cost) : "—"}</span>
      )
    case "createdAt":
      return (
        <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
      )
    default:
      return "-"
  }
}
