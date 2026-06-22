import type { ReactNode } from "react"
import { CellChip } from "@/engines/common"
import type { DataTableColumn } from "@/engines/list-view"
import {
  formatCurrencyValue,
  formatEasternDateTime,
  formatStableDate,
  type PaymentListRow,
} from "@builders/domain"

export function renderPaymentRowCell(
  column: DataTableColumn<PaymentListRow>,
  row: PaymentListRow,
): ReactNode {
  switch (column.key) {
    case "paymentNumber":
      return <span className="font-medium tabular-nums">{row.paymentNumber}</span>
    case "amount":
      // The colored chip reads `direction` directly — green inflow, red outflow
      // (mirrors the adjustments amount chip; no sign math).
      return (
        <CellChip tone={row.direction === "INFLOW" ? "success" : "error"}>
          {formatCurrencyValue(row.amount)}
        </CellChip>
      )
    case "direction":
      return <span>{row.direction === "INFLOW" ? "Inflow" : "Outflow"}</span>
    case "paymentDate":
      return (
        <span className="tabular-nums">
          {row.paymentDate ? formatStableDate(row.paymentDate) : "—"}
        </span>
      )
    case "createdAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
    default:
      return "-"
  }
}
