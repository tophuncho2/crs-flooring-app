"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
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
  pagination?: PaginateContract
}) {
  return (
    <DataTable<ManagementCompanyListRow>
      rows={rows}
      columns={MANAGEMENT_COMPANIES_LIST_COLUMNS}
      empty="No management companies match these filters."
      onOpenRow={(row) => onOpenCompany(row)}
      getRowAriaLabel={(row) => `Open management company ${row.name}`}
      renderCell={renderManagementCompanyRowCell}
      pagination={pagination}
    />
  )
}
