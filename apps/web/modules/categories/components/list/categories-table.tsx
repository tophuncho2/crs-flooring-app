"use client"

import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import type { CategoryRow } from "../../types"

const CATEGORIES_LIST_LAYOUT: GridLayout<CategoryRow> = {
  dataColumns: [
    { key: "name", label: "Category", minWidth: 240, grow: 1 },
    { key: "sendUnit", label: "Send Unit", minWidth: 160, grow: 0 },
    { key: "stockUnit", label: "Stock Unit", minWidth: 160, grow: 0 },
    { key: "itemCoverageUnit", label: "Item Coverage Unit", minWidth: 200, grow: 0 },
  ],
}

export type CategoriesTableProps = {
  rows: CategoryRow[]
}

export function CategoriesTable({ rows }: CategoriesTableProps) {
  return (
    <Grid<CategoryRow>
      rows={rows}
      layout={CATEGORIES_LIST_LAYOUT}
      empty={<GridEmpty>No categories found.</GridEmpty>}
      renderCell={(column, row) => {
        switch (column.key) {
          case "name":
            return <span className="font-medium">{row.name}</span>
          case "sendUnit":
            return row.sendUnit || "-"
          case "stockUnit":
            return row.stockUnit || "-"
          case "itemCoverageUnit":
            return row.itemCoverageUnit || "-"
          default:
            return "-"
        }
      }}
    />
  )
}
