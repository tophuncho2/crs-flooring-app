"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
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
  pagination?: PaginateContract
}) {
  return (
    <DataTable<WarehouseListRow>
      fill
      resizable
      rows={rows}
      columns={WAREHOUSE_LIST_COLUMNS}
      empty="No warehouses match these filters."
      onOpenRow={onOpen}
      getRowAriaLabel={(row) => `Open warehouse ${row.name}`}
      renderCell={renderWarehouseRowCell}
      pagination={pagination}
    />
  )
}
