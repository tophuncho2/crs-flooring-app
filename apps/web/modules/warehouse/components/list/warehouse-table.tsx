"use client"

import { DataTable, type PaginateContract, type TableOptionsConfig } from "@/engines/list-view"
import type { WarehouseListRow } from "@builders/domain"
import { WAREHOUSE_LIST_COLUMNS } from "./table/warehouse-list-columns"
import { renderWarehouseRowCell } from "./table/warehouse-row-cell"

export function WarehouseTable({
  rows,
  onOpen,
  tableOptions,
  pagination,
}: {
  rows: WarehouseListRow[]
  onOpen: (row: WarehouseListRow) => void
  /** Gutter TableOptions menu (the "Store #" row-number search tab). */
  tableOptions?: TableOptionsConfig
  pagination?: PaginateContract
}) {
  return (
    <DataTable<WarehouseListRow>
      rows={rows}
      columns={WAREHOUSE_LIST_COLUMNS}
      empty="No warehouses match these filters."
      tableOptions={tableOptions}
      onOpenRow={onOpen}
      getRowAriaLabel={(row) => `Open warehouse ${row.name}`}
      renderCell={renderWarehouseRowCell}
      pagination={pagination}
    />
  )
}
