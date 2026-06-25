"use client"

import { useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import {
  LIST_CATEGORIES_PAGE_SIZE,
  type CategoryListRow,
} from "@builders/domain"
import {
  CATEGORIES_LIST_QUERY_KEY,
  listCategoriesRequest,
} from "@/modules/categories/data/list-categories-request"
import { CategoriesTable } from "./categories-table"

export type CategoriesClientProps = {
  initialPage: number
}

// Read-only surface: bare DataTable + counted pagination. No toolbar, no search,
// no row-open — categories are a small reference catalog (editing comes later).
export default function CategoriesClient({ initialPage }: CategoriesClientProps) {
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
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="mx-4">
        <div className="pb-2">
          <span className="inline-block rounded-md border border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
            Categories
          </span>
        </div>
        <CategoriesTable
          rows={rows}
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
      </div>
    </div>
  )
}
