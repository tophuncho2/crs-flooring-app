"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/components/data-table"
import type { ManagementCompanyListRow } from "@builders/domain"
import { MANAGEMENT_COMPANIES_LIST_COLUMNS } from "./table/management-companies-list-columns"
import { renderManagementCompanyRowCell } from "./table/management-companies-row-cell"

export function ManagementCompaniesTable({
  rows,
  onOpenCompany,
  pagination,
}: {
  rows: ManagementCompanyListRow[]
  onOpenCompany: (row: ManagementCompanyListRow) => void
  pagination?: ReactNode
}) {
  return (
    <DataTable<ManagementCompanyListRow>
      rows={rows}
      columns={MANAGEMENT_COMPANIES_LIST_COLUMNS}
      empty="No management companies match these filters."
      onRowClick={(row) => onOpenCompany(row)}
      getRowAriaLabel={(row) => `Open management company ${row.name}`}
      renderCell={renderManagementCompanyRowCell}
      footerSlot={pagination}
    />
  )
}
