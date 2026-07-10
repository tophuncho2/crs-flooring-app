"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { InventoryIndicatorRow } from "@builders/domain"
import { INDICATORS_LIST_COLUMNS } from "./table/inventory-indicators-list-columns"
import { renderIndicatorsRowCell } from "./table/inventory-indicators-row-cell"

export function InventoryIndicatorsTable({
  rows,
  onOpenIndicator,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: InventoryIndicatorRow[]
  /** Row click → open the indicator inside its parent product's record view. */
  onOpenIndicator: (row: InventoryIndicatorRow) => void
  pagination?: PaginateContract
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<InventoryIndicatorRow>
      fill
      resizable
      rows={rows}
      columns={INDICATORS_LIST_COLUMNS}
      empty="No inventory indicators match these filters."
      onOpenRow={(row) => onOpenIndicator(row)}
      getRowAriaLabel={(row) => `Open indicator ${row.indicatorNumber}`}
      renderCell={renderIndicatorsRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
