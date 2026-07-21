import type { ReactNode } from "react"
import { CellChip } from "@/engines/common"
import type { DataTableColumn } from "@/engines/list-view"
import {
  formatEasternDateTime,
  formatPhoneNumber,
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
      // The palette tag recolors the PAY-# identity cell (mirrors inventory/WO).
      return <CellChip paletteColor={row.color}>{row.paymentNumber}</CellChip>
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
    case "paymentPurpose":
      // Mirrors the record view's colored purpose chip (same PaletteColor tag).
      return row.paymentPurposeName ? (
        <CellChip paletteColor={row.paymentPurposeColor ?? undefined}>{row.paymentPurposeName}</CellChip>
      ) : (
        "—"
      )
    case "entity":
      return <span>{row.entityName ?? "—"}</span>
    case "types":
      // Same palette chip the entities list + payment record view render.
      return row.entityType ? (
        <CellChip paletteColor={row.entityType.color}>{row.entityType.type}</CellChip>
      ) : (
        "—"
      )
    case "workOrder":
      return <span className="tabular-nums">{row.workOrderNumber ?? "—"}</span>
    case "paymentDate":
      return (
        <span className="tabular-nums">
          {row.paymentDate ? formatStableDate(row.paymentDate) : "—"}
        </span>
      )
    case "paymentMethod":
      return <span>{row.paymentMethod || "—"}</span>
    case "receiptNumber":
      return <span>{row.receiptNumber || "—"}</span>
    case "storePhone":
      return <span className="tabular-nums">{formatPhoneNumber(row.storePhone ?? "") || "—"}</span>
    case "storeAddress":
      return <span>{row.storeAddress || "—"}</span>
    case "storeNumber":
      return <span>{row.storeNumber || "—"}</span>
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
