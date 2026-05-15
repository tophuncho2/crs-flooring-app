"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/components/data-table"
import type { ManufacturerListRow } from "@builders/domain"
import { MANUFACTURERS_LIST_COLUMNS } from "./table/manufacturers-list-columns"
import { renderManufacturerRowCell } from "./table/manufacturers-row-cell"

export function ManufacturersTable({
  rows,
  onOpenManufacturer,
  pagination,
}: {
  rows: ManufacturerListRow[]
  onOpenManufacturer: (id: string) => void
  pagination?: ReactNode
}) {
  return (
    <DataTable<ManufacturerListRow>
      rows={rows}
      columns={MANUFACTURERS_LIST_COLUMNS}
      empty="No manufacturers found."
      onRowClick={(row) => onOpenManufacturer(row.id)}
      getRowAriaLabel={(row) => `Open manufacturer ${row.companyName}`}
      renderCell={renderManufacturerRowCell}
      footerSlot={pagination}
    />
  )
}
