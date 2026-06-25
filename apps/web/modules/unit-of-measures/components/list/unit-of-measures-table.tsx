"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { UnitOfMeasureListRow } from "@builders/domain"
import { UNIT_OF_MEASURES_LIST_COLUMNS } from "./table/unit-of-measures-list-columns"
import { renderUnitOfMeasureRowCell } from "./table/unit-of-measures-row-cell"

export function UnitOfMeasuresTable({
  rows,
  pagination,
}: {
  rows: UnitOfMeasureListRow[]
  pagination?: PaginateContract
}) {
  return (
    <DataTable<UnitOfMeasureListRow>
      rows={rows}
      columns={UNIT_OF_MEASURES_LIST_COLUMNS}
      empty="No units of measure found."
      renderCell={renderUnitOfMeasureRowCell}
      pagination={pagination}
    />
  )
}
