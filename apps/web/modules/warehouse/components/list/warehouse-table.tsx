"use client"

import { DataTable } from "@/components/data-table"
import type { WarehouseRecord } from "@builders/db"
import { WAREHOUSE_LIST_COLUMNS } from "./table/warehouse-list-columns"
import { renderWarehouseRowCell } from "./table/warehouse-row-cell"

export function WarehouseTable({
  rows,
  onOpen,
}: {
  rows: WarehouseRecord[]
  onOpen: (row: WarehouseRecord) => void
}) {
  return (
    <DataTable<WarehouseRecord>
      rows={rows}
      columns={WAREHOUSE_LIST_COLUMNS}
      empty="No warehouses match these filters."
      onRowClick={onOpen}
      getRowAriaLabel={(row) => `Open warehouse ${row.name}`}
      renderCell={renderWarehouseRowCell}
    />
  )
}
