"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/engines/list-view"
import type { LaborPaymentListRow } from "@builders/domain"
import { LABOR_PAYMENTS_LIST_COLUMNS } from "./table/labor-payments-list-columns"
import { renderLaborPaymentRowCell } from "./table/labor-payments-row-cell"

export function LaborPaymentsTable({
  rows,
  onOpenLaborPayment,
  pagination,
}: {
  rows: LaborPaymentListRow[]
  onOpenLaborPayment: (row: LaborPaymentListRow) => void
  pagination?: ReactNode
}) {
  return (
    <DataTable<LaborPaymentListRow>
      rows={rows}
      columns={LABOR_PAYMENTS_LIST_COLUMNS}
      empty="No labor payments match this search."
      onOpenRow={(row) => onOpenLaborPayment(row)}
      getRowAriaLabel={(row) => `Open labor payment for ${row.contactName}`}
      renderCell={renderLaborPaymentRowCell}
      footerSlot={pagination}
    />
  )
}
