"use client"

import {
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
  ListPageShell,
  ListHeaderPortal,
} from "@/engines/list-view"
import {
  LIST_CATEGORIES_PAGE_SIZE,
  type CategoryListRow,
} from "@builders/domain"
import { useRecordEntryNavigation } from "@/hooks/navigation"
import {
  CATEGORIES_LIST_QUERY_KEY,
  listCategoriesRequest,
} from "@/modules/categories/data/list-categories-request"
import { CategoriesTable } from "./categories-table"

export type CategoriesClientProps = {
  initialPage: number
}

// Read-only surface: bare DataTable + counted pagination. No toolbar, no search;
// rows open a read-only detail. Categories are a seed-sourced reference catalog
// (no user CRUD yet).
export default function CategoriesClient({ initialPage }: CategoriesClientProps) {
  const { openRecord } = useRecordEntryNavigation("/dashboard/categories")
  const {
    rows,
    total,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
  } = useFetchListController<CategoryListRow, Record<string, never>>({
    mode: "fetch",
    queryKey: [...CATEGORIES_LIST_QUERY_KEY],
    listFn: listCategoriesRequest,
    initialPage,
    pageSize: LIST_CATEGORIES_PAGE_SIZE,
    tableKey: "categories-main",
    freshness: LIST_FRESHNESS_STANDARD,
  })

  return (
    <ListPageShell fill>
      <ListHeaderPortal
        label="Categories"
        rowCount={rows.length}
        total={total}
        rowCountLabel="categories"
      />
      <CategoriesTable
        rows={rows}
        onOpenCategory={(row) => openRecord(row.id)}
        pagination={{
          page,
          pageSize,
          totalItems: total,
          totalPages,
          hasPreviousPage,
          hasNextPage,
          onPreviousPage: goToPreviousPage,
          onNextPage: goToNextPage,
        }}
      />
    </ListPageShell>
  )
}
