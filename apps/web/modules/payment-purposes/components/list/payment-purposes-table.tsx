"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { PaymentPurposeListRow } from "@builders/domain"
import { PAYMENT_PURPOSES_LIST_COLUMNS } from "./table/payment-purposes-list-columns"
import { renderPaymentPurposeRowCell } from "./table/payment-purposes-row-cell"

export function PaymentPurposesTable({
  rows,
  onOpenPaymentPurpose,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: PaymentPurposeListRow[]
  onOpenPaymentPurpose: (row: PaymentPurposeListRow) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<PaymentPurposeListRow>
      fill
      resizable
      rows={rows}
      columns={PAYMENT_PURPOSES_LIST_COLUMNS}
      empty="No payment purposes match this search."
      onOpenRow={(row) => onOpenPaymentPurpose(row)}
      getRowAriaLabel={(row) => `Open payment purpose ${row.name}`}
      renderCell={renderPaymentPurposeRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
