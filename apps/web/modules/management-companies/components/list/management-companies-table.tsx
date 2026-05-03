"use client"

import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { PaginateControls } from "@/components/features/paginate"
import type { ManagementCompanyListRow } from "@builders/domain"

const MANAGEMENT_COMPANIES_LIST_LAYOUT: GridLayout<ManagementCompanyListRow> = {
  dataColumns: [
    { key: "name", label: "Company", minWidth: 200, grow: 1 },
    { key: "streetAddress", label: "Street", minWidth: 180, grow: 1 },
    { key: "city", label: "City", minWidth: 120, grow: 0 },
    { key: "state", label: "State", minWidth: 70, grow: 0 },
    { key: "zip", label: "Zip", minWidth: 80, grow: 0 },
    { key: "phone", label: "Phone", minWidth: 130, grow: 0 },
    { key: "email", label: "Email", minWidth: 200, grow: 1 },
    { key: "propertyCount", label: "Properties", kind: "number", minWidth: 100, grow: 0, align: "end" },
  ],
}

export type ManagementCompaniesTableProps = {
  rows: ManagementCompanyListRow[]
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onOpenCompany: (id: string) => void
}

export function ManagementCompaniesTable({
  rows,
  page,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  onOpenCompany,
}: ManagementCompaniesTableProps) {
  return (
    <Grid<ManagementCompanyListRow>
      rows={rows}
      layout={MANAGEMENT_COMPANIES_LIST_LAYOUT}
      empty={<GridEmpty>No management companies found.</GridEmpty>}
      onRowClick={(row) => onOpenCompany(row.id)}
      getRowAriaLabel={(row) => `Edit management company ${row.name}`}
      renderCell={(column, row) => {
        switch (column.key) {
          case "name":
            return <span className="font-medium text-blue-500">{row.name}</span>
          case "streetAddress":
            return row.streetAddress || "-"
          case "city":
            return row.city || "-"
          case "state":
            return row.state || "-"
          case "zip":
            return row.zip || "-"
          case "phone":
            return row.phone || "-"
          case "email":
            return row.email || "-"
          case "propertyCount":
            return <span className="tabular-nums">{row.propertyCount}</span>
          default:
            return "-"
        }
      }}
      footerSlot={
        <PaginateControls
          page={page}
          pageSize={pageSize}
          totalItems={totalItems}
          totalPages={totalPages}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
        />
      }
    />
  )
}
