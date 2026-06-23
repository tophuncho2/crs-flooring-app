import type { ReactNode } from "react"
import { CellChip } from "@/engines/common"
import type { DataTableColumn } from "@/engines/list-view"
import {
  formatEasternDateTime,
  formatSignedPaymentAmount,
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
      // The figure is prefixed with its direction sign (+ revenue / − expense) and
      // the chip tone reads `direction` directly — mirrors the adjustments amount chip.
      return (
        <CellChip tone={row.direction === "REVENUE" ? "success" : "error"}>
          {formatSignedPaymentAmount(row.amount, row.direction)}
        </CellChip>
      )
    case "direction":
      return <span>{row.direction === "REVENUE" ? "Revenue" : "Expense"}</span>
    case "paymentDate":
      return (
        <span className="tabular-nums">
          {row.paymentDate ? formatStableDate(row.paymentDate) : "—"}
        </span>
      )
    case "updatedAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.updatedAt) || "—"}</span>
    case "createdAt":
      return <span className="tabular-nums">{formatEasternDateTime(row.createdAt) || "—"}</span>
    case "createdBy":
      return <span>{row.createdBy ?? "—"}</span>
    case "updatedBy":
      return <span>{row.updatedBy ?? "—"}</span>
    default:
      return "-"
  }
}
