"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { CategoryListRow } from "@builders/domain"
import { CATEGORIES_LIST_COLUMNS } from "./table/categories-list-columns"
import { renderCategoryRowCell } from "./table/categories-row-cell"

export function CategoriesTable({
  rows,
  onOpenCategory,
  pagination,
}: {
  rows: CategoryListRow[]
  onOpenCategory: (row: CategoryListRow) => void
  pagination?: PaginateContract
}) {
  return (
    <DataTable<CategoryListRow>
      fill
      resizable
      rows={rows}
      columns={CATEGORIES_LIST_COLUMNS}
      empty="No categories found."
      onOpenRow={(row) => onOpenCategory(row)}
      getRowAriaLabel={(row) => `Open category ${row.name}`}
      renderCell={renderCategoryRowCell}
      pagination={pagination}
    />
  )
}
