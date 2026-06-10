import type { ReactNode } from "react"
import type { GridColumn, GridLayout } from "@/engines/record-view"
import { formatCurrencyValue, formatEasternDateTime, type LaborPaymentListRow } from "@builders/domain"

/** Column shape for the contact record view's labor-payments section grid. */
export const LABOR_PAYMENT_SECTION_LAYOUT: GridLayout<LaborPaymentListRow> = {
  dataColumns: [
    { key: "unit", label: "Unit", minWidth: 140, grow: 0.6 },
    { key: "description", label: "Description", minWidth: 240, grow: 1.5 },
    { key: "cost", label: "Cost", minWidth: 120, grow: 0, align: "end" },
    { key: "createdAt", label: "Created", minWidth: 168, grow: 0 },
  ] satisfies ReadonlyArray<GridColumn<LaborPaymentListRow>>,
}

export function renderLaborPaymentSectionCell(
  column: GridColumn<LaborPaymentListRow>,
  row: LaborPaymentListRow,
): ReactNode {
  switch (column.key) {
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
