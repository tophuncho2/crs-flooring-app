import type { ReactNode } from "react"
import type { DataTableColumn } from "@/engines/list-view"
import { CellChip } from "@/engines/common"
import { formatEasternDateTime, type PaymentPurposeListRow } from "@builders/domain"

export function renderPaymentPurposeRowCell(
  column: DataTableColumn<PaymentPurposeListRow>,
  row: PaymentPurposeListRow,
): ReactNode {
  switch (column.key) {
    case "paymentPurposeNumber":
      return <span className="font-medium tabular-nums">{row.paymentPurposeNumber}</span>
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
