"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { UnitOfMeasureListRow } from "@builders/domain"
import { UNIT_OF_MEASURES_LIST_COLUMNS } from "./table/unit-of-measures-list-columns"
import { renderUnitOfMeasureRowCell } from "./table/unit-of-measures-row-cell"

export function UnitOfMeasuresTable({
  rows,
  onOpenUnitOfMeasure,
  pagination,
  columnWidths,
  onColumnWidthsChange,
}: {
  rows: UnitOfMeasureListRow[]
  onOpenUnitOfMeasure: (row: UnitOfMeasureListRow) => void
  pagination?: PaginateContract
  /** Persisted column widths (px) + setter — the DataTable resize seam. */
  columnWidths?: Record<string, number>
  onColumnWidthsChange?: (next: Record<string, number>) => void
}) {
  return (
    <DataTable<UnitOfMeasureListRow>
      fill
      resizable
      rows={rows}
      columns={UNIT_OF_MEASURES_LIST_COLUMNS}
      empty="No units of measure found."
      onOpenRow={(row) => onOpenUnitOfMeasure(row)}
      getRowAriaLabel={(row) => `Open unit of measure ${row.name}`}
      renderCell={renderUnitOfMeasureRowCell}
      pagination={pagination}
      columnWidths={columnWidths}
      onColumnWidthsChange={onColumnWidthsChange}
    />
  )
}
