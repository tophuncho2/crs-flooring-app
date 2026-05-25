"use client"

import { useCallback, useMemo } from "react"
import { PaginateControls } from "@/components/features/paginate"
import {
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
} from "@/components/features/list-toolbar"
import { useFetchListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { ProductsListFilters } from "@builders/application"
import {
  LIST_PRODUCTS_PAGE_SIZE,
  type CategoryOption,
  type ProductListRow,
} from "@builders/domain"
import {
  PRODUCTS_LIST_QUERY_KEY,
  listProductsRequest,
} from "@/modules/products/data/list-products-request"
import { useProductsListController } from "@/modules/products/controllers/use-products-list-controller"
import { ProductsTable } from "./products-table"
import { AddProductButton } from "./toolbar-controls/add-product-button"
import { CategoryFilterChip } from "./toolbar-controls/category-filter-chip"
import { ProductsListSearch } from "./toolbar-controls/products-list-search"
import { ProductsClearAll } from "./toolbar-controls/sub-controls/products-clear-all"
import { ProductsRowCount } from "./toolbar-controls/sub-controls/products-row-count"

const PRODUCTS_FILTERABLE_FIELDS = ["categoryId"] as const

export type ProductsClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: ProductsListFilters
  initialCategoryOptions: CategoryOption[]
  initialSelectedCategory?: CategoryOption | null
}

export default function ProductsClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialCategoryOptions,
  initialSelectedCategory = null,
}: ProductsClientProps) {
  const { message, pageError, openCreate, openProduct } = useProductsListController()

  const {
    rows,
    total,
    searchQuery,
    filters,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSearchQueryChange,
    onFilterChange,
    onClearAllFilters,
  } = useFetchListController<ProductListRow, ProductsListFilters>({
    mode: "fetch",
    queryKey: [...PRODUCTS_LIST_QUERY_KEY],
    listFn: listProductsRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: LIST_PRODUCTS_PAGE_SIZE,
    tableKey: "products-main",
    filterableFields: PRODUCTS_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const selectedCategoryId = useMemo(() => {
    const ids = (filters as ProductsListFilters).categoryId
    return ids && ids.length > 0 ? ids[0] : null
  }, [filters])

  const selectedCategoryLabel = useMemo(() => {
    if (!selectedCategoryId) return null
    if (
      initialSelectedCategory &&
      initialSelectedCategory.id === selectedCategoryId
    ) {
      return initialSelectedCategory.name
    }
    const seeded = initialCategoryOptions.find(
      (option) => option.id === selectedCategoryId,
    )
    return seeded ? seeded.name : null
  }, [
    selectedCategoryId,
    initialSelectedCategory,
    initialCategoryOptions,
  ])

  const handleCategoryChange = useCallback(
    (id: string | null) => {
      onFilterChange("categoryId", id ? [id] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (selectedCategoryId) return true
    return false
  }, [searchQuery, selectedCategoryId])

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        {message || pageError ? (
          <div className="space-y-2 border-b border-[var(--panel-border)] px-4 py-3">
            {message ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
                {message}
              </div>
            ) : null}
            {pageError ? (
              <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
                {pageError}
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <div className="px-4 pt-3">
            <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
              Flooring Products
            </span>
          </div>
          {/* pt-0 overrides ListToolbar's pt-4 so the tab's bottom edge meets
              the encased card's top edge (rounded-tl-none seam). */}
          <ListToolbar className="pt-0">
            {/* Search + (Clear all | row count) — encased card attached to the tab above */}
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <ProductsListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <ListToolbarBottomRow
                  left={<ProductsClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<ProductsRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            {/* Category */}
            <ListToolbarCell>
              <CategoryFilterChip
                value={selectedCategoryId}
                selectedLabel={selectedCategoryLabel}
                onChange={handleCategoryChange}
                initialOptions={initialCategoryOptions}
              />
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <AddProductButton onClick={() => openCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>

        <ProductsTable
          rows={rows}
          onOpenProduct={openProduct}
          pagination={
            <PaginateControls
              page={page}
              pageSize={pageSize}
              totalItems={total}
              totalPages={totalPages}
              hasPreviousPage={hasPreviousPage}
              hasNextPage={hasNextPage}
              onPreviousPage={goToPreviousPage}
              onNextPage={goToNextPage}
            />
          }
        />
      </div>
    </div>
  )
}
