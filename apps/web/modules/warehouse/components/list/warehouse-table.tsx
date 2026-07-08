"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { WarehouseListRow } from "@builders/domain"
import { WAREHOUSE_LIST_COLUMNS } from "./table/warehouse-list-columns"
import { renderWarehouseRowCell } from "./table/warehouse-row-cell"

export function WarehouseTable({
  rows,
  onOpen,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: WarehouseListRow[]
  onOpen: (row: WarehouseListRow) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
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
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
