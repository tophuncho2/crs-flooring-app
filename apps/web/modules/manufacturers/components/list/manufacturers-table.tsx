"use client"

import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { PaginateControls } from "@/components/features/paginate"
import type { ManufacturerListRow } from "@builders/domain"

const MANUFACTURERS_LIST_LAYOUT: GridLayout<ManufacturerListRow> = {
  dataColumns: [
    { key: "companyName", label: "Company", minWidth: 200, grow: 1 },
    { key: "agentName", label: "Agent", minWidth: 160, grow: 1 },
    { key: "website", label: "Website", minWidth: 180, grow: 1 },
    { key: "phone", label: "Phone", minWidth: 130, grow: 0 },
    { key: "email", label: "Email", minWidth: 200, grow: 1 },
    { key: "productsCount", label: "Products", kind: "number", minWidth: 90, grow: 0, align: "end" },
  ],
}

export type ManufacturersTableProps = {
  rows: ManufacturerListRow[]
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage: () => void
  onNextPage: () => void
  onOpenManufacturer: (id: string) => void
}

export function ManufacturersTable({
  rows,
  page,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  onOpenManufacturer,
}: ManufacturersTableProps) {
  return (
    <Grid<ManufacturerListRow>
      rows={rows}
      layout={MANUFACTURERS_LIST_LAYOUT}
      empty={<GridEmpty>No manufacturers found.</GridEmpty>}
      onRowClick={(row) => onOpenManufacturer(row.id)}
      getRowAriaLabel={(row) => `Open manufacturer ${row.companyName}`}
      renderCell={(column, row) => {
        switch (column.key) {
          case "companyName":
            return <span className="font-medium text-blue-500">{row.companyName || "-"}</span>
          case "agentName":
            return row.agentName || "-"
          case "website":
            return row.website || "-"
          case "phone":
            return row.phone || "-"
          case "email":
            return row.email || "-"
          case "productsCount":
            return <span className="tabular-nums">{row.productsCount}</span>
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
