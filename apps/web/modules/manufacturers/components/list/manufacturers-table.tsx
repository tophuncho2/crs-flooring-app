"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/engines/list-view"
import type { ManufacturerListRow } from "@builders/domain"
import { MANUFACTURERS_LIST_COLUMNS } from "./table/manufacturers-list-columns"
import { renderManufacturerRowCell } from "./table/manufacturers-row-cell"

export function ManufacturersTable({
  rows,
  onOpen,
  pagination,
}: {
  rows: ManufacturerListRow[]
  onOpen: (row: ManufacturerListRow) => void
  pagination?: ReactNode
}) {
  return (
    <DataTable<ManufacturerListRow>
      rows={rows}
      columns={MANUFACTURERS_LIST_COLUMNS}
      empty="No manufacturers found."
      onOpenRow={onOpen}
      getRowAriaLabel={(row) => `Open manufacturer ${row.companyName}`}
      renderCell={renderManufacturerRowCell}
      footerSlot={pagination}
    />
  )
}
