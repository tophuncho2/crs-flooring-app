"use client"

import { useMemo } from "react"
import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { useServerListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { ProductsListFilters } from "@builders/application"
import {
  LIST_PRODUCTS_PAGE_SIZE,
  type CategoryOption,
  type ProductListRow,
  type TablePreferencePayload,
} from "@builders/domain"
import {
  PRODUCTS_LIST_QUERY_KEY,
  listProductsRequest,
} from "@/modules/products/data/list-products-request"
import { useProductsListController } from "@/modules/products/controllers/use-products-list-controller"
import { CategoryFilterChip } from "./category-filter-chip"
import { ProductsTable } from "./products-table"

const PRODUCTS_FILTERABLE_FIELDS = ["categoryId"] as const

export type ProductsClientProps = {
  initialTablePreferences?: TablePreferencePayload | null
  initialSearchQuery: string
  initialPage: number
  initialFilters: ProductsListFilters
  initialCategoryOptions: CategoryOption[]
  initialSelectedCategory?: CategoryOption | null
}

export default function ProductsClient({
  initialTablePreferences,
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
  } = useServerListController<ProductListRow, ProductsListFilters>({
    mode: "fetch",
    queryKey: [...PRODUCTS_LIST_QUERY_KEY],
    listFn: listProductsRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: LIST_PRODUCTS_PAGE_SIZE,
    tableKey: "products-main",
    initialTablePreferences,
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

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Flooring Products"
          actions={[{ key: "new", label: "+ Product", onClick: () => openCreate(), kind: "primary" }]}
        />

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

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] px-4 py-3">
          <div className="min-w-[16rem] flex-1">
            <SearchControl
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
              placeholder="Search products"
            />
          </div>
          <CategoryFilterChip
            value={selectedCategoryId}
            selectedLabel={selectedCategoryLabel}
            onChange={(id) =>
              onFilterChange("categoryId", id ? [id] : [])
            }
            initialOptions={initialCategoryOptions}
          />
          <span className="text-xs text-[var(--foreground)]/55">
            {rows.length} of {total} products
          </span>
        </div>

        <ProductsTable
          rows={rows}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={total}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onOpenProduct={openProduct}
        />
      </div>
    </div>
  )
}
