"use client"

import type { ReactNode } from "react"
import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { PaymentListRow } from "@builders/domain"
import { PAYMENTS_LIST_COLUMNS } from "./table/payments-list-columns"
import { renderPaymentRowCell } from "./table/payments-row-cell"

export function PaymentsTable({
  rows,
  onOpenPayment,
  rowActions,
  fill = true,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: PaymentListRow[]
  onOpenPayment: (row: PaymentListRow) => void
  /**
   * Optional per-row ⋮ options menu, rendered in the leading gutter beside the
   * open button. Supplied ONLY by the work-order record-view section (where the
   * hard-delete lives); the standalone /dashboard/payments list omits it, so the
   * menu never shows there.
   */
  rowActions?: (row: PaymentListRow) => ReactNode
  /**
   * List-page fill mode (bounded, full-height card). Default `true` for the
   * standalone list; the work-order record-view section passes `false` so the
   * table sizes to its content inside the section card.
   */
  fill?: boolean
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<PaymentListRow>
      fill={fill}
      resizable={fill}
      rows={rows}
      columns={PAYMENTS_LIST_COLUMNS}
      empty="No payments yet."
      onOpenRow={(row) => onOpenPayment(row)}
      getRowAriaLabel={(row) => `Open payment ${row.paymentNumber}`}
      renderCell={renderPaymentRowCell}
      rowActions={rowActions}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
