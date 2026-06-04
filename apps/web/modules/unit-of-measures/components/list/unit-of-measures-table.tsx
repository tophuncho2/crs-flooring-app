"use client"

import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { formatStableDateTime } from "@builders/domain"
import type { UnitOfMeasureRow } from "../../types"

const UNIT_OF_MEASURES_LIST_COLUMNS: DataTableColumn<UnitOfMeasureRow>[] = [
  { key: "name", label: "Unit Of Measure" },
  { key: "createdAt", label: "Created" },
]

export type UnitOfMeasuresTableProps = {
  rows: UnitOfMeasureRow[]
}

export function UnitOfMeasuresTable({ rows }: UnitOfMeasuresTableProps) {
  return (
    <DataTable<UnitOfMeasureRow>
      rows={rows}
      columns={UNIT_OF_MEASURES_LIST_COLUMNS}
      empty="No units of measure found."
      renderCell={(column, row) => {
        switch (column.key) {
          case "name":
            return <span className="font-medium">{row.name}</span>
          case "createdAt":
            return formatStableDateTime(row.createdAt)
          default:
            return "-"
        }
      }}
    />
  )
}
