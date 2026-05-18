"use client"

import type { ReactNode } from "react"
import { DataTable } from "@/components/data-table"
import type { WarehouseListRow } from "@builders/domain"
import { WAREHOUSE_LIST_COLUMNS } from "./table/warehouse-list-columns"
import { renderWarehouseRowCell } from "./table/warehouse-row-cell"

export function WarehouseTable({
  rows,
  onOpen,
  pagination,
}: {
  rows: WarehouseListRow[]
  onOpen: (row: WarehouseListRow) => void
  pagination?: ReactNode
}) {
  return (
    <DataTable<WarehouseListRow>
      rows={rows}
      columns={WAREHOUSE_LIST_COLUMNS}
      empty="No warehouses match these filters."
      onRowClick={onOpen}
      getRowAriaLabel={(row) => `Open warehouse ${row.name}`}
      renderCell={renderWarehouseRowCell}
      footerSlot={pagination}
    />
  )
}
