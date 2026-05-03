"use client"

import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { formatStableDateTime } from "@builders/domain"
import type { UnitOfMeasureRow } from "../../types"

const UNIT_OF_MEASURES_LIST_LAYOUT: GridLayout<UnitOfMeasureRow> = {
  dataColumns: [
    { key: "name", label: "Unit Of Measure", minWidth: 240, grow: 1 },
    { key: "createdAt", label: "Created", minWidth: 200, grow: 0 },
  ],
}

export type UnitOfMeasuresTableProps = {
  rows: UnitOfMeasureRow[]
}

export function UnitOfMeasuresTable({ rows }: UnitOfMeasuresTableProps) {
  return (
    <Grid<UnitOfMeasureRow>
      rows={rows}
      layout={UNIT_OF_MEASURES_LIST_LAYOUT}
      empty={<GridEmpty>No units of measure found.</GridEmpty>}
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
