"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { UnitOfMeasureListRow } from "@builders/domain"
import { UNIT_OF_MEASURES_LIST_COLUMNS } from "./table/unit-of-measures-list-columns"
import { renderUnitOfMeasureRowCell } from "./table/unit-of-measures-row-cell"

export function UnitOfMeasuresTable({
  rows,
  onOpenUnitOfMeasure,
  pagination,
}: {
  rows: UnitOfMeasureListRow[]
  onOpenUnitOfMeasure: (row: UnitOfMeasureListRow) => void
  pagination?: PaginateContract
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
    />
  )
}
