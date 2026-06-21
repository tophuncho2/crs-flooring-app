"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { PaymentListRow } from "@builders/domain"
import { PAYMENTS_LIST_COLUMNS } from "./table/payments-list-columns"
import { renderPaymentRowCell } from "./table/payments-row-cell"

export function PaymentsTable({
  rows,
  onOpenPayment,
  pagination,
}: {
  rows: PaymentListRow[]
  onOpenPayment: (row: PaymentListRow) => void
  pagination?: PaginateContract
}) {
  return (
    <DataTable<PaymentListRow>
      rows={rows}
      columns={PAYMENTS_LIST_COLUMNS}
      empty="No payments yet."
      onOpenRow={(row) => onOpenPayment(row)}
      getRowAriaLabel={(row) => `Open payment ${row.paymentNumber}`}
      renderCell={renderPaymentRowCell}
      pagination={pagination}
    />
  )
}
