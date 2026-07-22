"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { InventoryAgeIndicatorListRow } from "@builders/domain"
import { INVENTORY_AGE_INDICATORS_LIST_COLUMNS } from "./table/inventory-age-indicators-list-columns"
import { renderInventoryAgeIndicatorRowCell } from "./table/inventory-age-indicators-row-cell"

export function InventoryAgeIndicatorsTable({
  rows,
  onOpenInventoryAgeIndicator,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: InventoryAgeIndicatorListRow[]
  onOpenInventoryAgeIndicator: (row: InventoryAgeIndicatorListRow) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<InventoryAgeIndicatorListRow>
      fill
      resizable
      rows={rows}
      columns={INVENTORY_AGE_INDICATORS_LIST_COLUMNS}
      empty="No age indicators yet. Create one to start coloring inventory by age."
      onOpenRow={(row) => onOpenInventoryAgeIndicator(row)}
      getRowAriaLabel={(row) => `Open age indicator ${row.days} days`}
      renderCell={renderInventoryAgeIndicatorRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
