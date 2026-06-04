"use client"

import { DataTable, type DataTableColumn } from "@/engines/list-view"
import type { CategoryRow } from "../../types"

const CATEGORIES_LIST_COLUMNS: DataTableColumn<CategoryRow>[] = [
  { key: "name", label: "Category" },
  { key: "sendUnit", label: "Send Unit" },
  { key: "stockUnit", label: "Stock Unit" },
  { key: "itemCoverageUnit", label: "Item Coverage Unit" },
]

export type CategoriesTableProps = {
  rows: CategoryRow[]
}

export function CategoriesTable({ rows }: CategoriesTableProps) {
  return (
    <DataTable<CategoryRow>
      rows={rows}
      columns={CATEGORIES_LIST_COLUMNS}
      empty="No categories found."
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
