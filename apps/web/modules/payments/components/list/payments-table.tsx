"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { PaymentListRow } from "@builders/domain"
import { PAYMENTS_LIST_COLUMNS } from "./table/payments-list-columns"
import { renderPaymentRowCell } from "./table/payments-row-cell"

export function PaymentsTable({
  rows,
  onOpenPayment,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: PaymentListRow[]
  onOpenPayment: (row: PaymentListRow) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<PaymentListRow>
      fill
      resizable
      rows={rows}
      columns={PAYMENTS_LIST_COLUMNS}
      empty="No payments yet."
      onOpenRow={(row) => onOpenPayment(row)}
      getRowAriaLabel={(row) => `Open payment ${row.paymentNumber}`}
      renderCell={renderPaymentRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
