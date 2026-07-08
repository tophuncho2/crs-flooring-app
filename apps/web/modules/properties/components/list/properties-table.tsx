"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { PropertyListRow } from "@builders/domain"
import { PROPERTIES_LIST_COLUMNS } from "./table/properties-list-columns"
import { renderPropertyRowCell } from "./table/properties-row-cell"

export function PropertiesTable({
  rows,
  onOpenProperty,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: PropertyListRow[]
  onOpenProperty: (row: PropertyListRow) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<PropertyListRow>
      fill
      resizable
      rows={rows}
      columns={PROPERTIES_LIST_COLUMNS}
      empty="No properties match these filters."
      onOpenRow={(row) => onOpenProperty(row)}
      getRowAriaLabel={(row) => `Open property ${row.name}`}
      renderCell={renderPropertyRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
