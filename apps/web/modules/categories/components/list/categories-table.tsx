"use client"

import { DataTable, type PaginateContract } from "@/engines/list-view"
import type { CategoryListRow } from "@builders/domain"
import { CATEGORIES_LIST_COLUMNS } from "./table/categories-list-columns"
import { renderCategoryRowCell } from "./table/categories-row-cell"

export function CategoriesTable({
  rows,
  pagination,
}: {
  rows: CategoryListRow[]
  pagination?: PaginateContract
}) {
  return (
    <DataTable<CategoryListRow>
      rows={rows}
      columns={CATEGORIES_LIST_COLUMNS}
      empty="No categories found."
      renderCell={renderCategoryRowCell}
      pagination={pagination}
    />
  )
}
