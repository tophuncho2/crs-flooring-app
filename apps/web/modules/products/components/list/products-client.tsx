"use client"

import { useCallback, useMemo } from "react"
import { DebouncedSearchControl, ListToolbar, ListToolbarBottomRow, ListToolbarCell, useFetchListController, LIST_FRESHNESS_STANDARD, type TableOptionsConfig } from "@/engines/list-view"
import type { ListInput, ProductsListFilters } from "@builders/application"
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

const PRODUCTS_FILTERABLE_FIELDS = [
  "prodNumber",
  "color",
  "style",
  "namingAddon",
  "categoryId",
] as const

// The list-view engine stores every filter value as `string[]`. The app filter
// type carries scalars (`prodNumber`/`color`/`style`/`namingAddon`) alongside the
// `categoryId` array, so we bridge the two the same way properties does: an
// all-array engine view + adapters at the edge.
type EngineProductsFilters = {
  prodNumber?: ReadonlyArray<string>
  color?: ReadonlyArray<string>
  style?: ReadonlyArray<string>
  namingAddon?: ReadonlyArray<string>
  categoryId?: ReadonlyArray<string>
}

function toEngineFilters(app: ProductsListFilters): EngineProductsFilters {
  const out: EngineProductsFilters = {}
  if (app.prodNumber && app.prodNumber.length > 0) out.prodNumber = [app.prodNumber]
  if (app.color && app.color.length > 0) out.color = [app.color]
  if (app.style && app.style.length > 0) out.style = [app.style]
  if (app.namingAddon && app.namingAddon.length > 0) out.namingAddon = [app.namingAddon]
  if (app.categoryId?.length) out.categoryId = app.categoryId
  return out
}

function toAppFilters(engine: EngineProductsFilters): ProductsListFilters {
  const out: ProductsListFilters = {}
  const prodNumber = engine.prodNumber?.[0]?.trim()
  if (prodNumber) out.prodNumber = prodNumber
  const color = engine.color?.[0]?.trim()
  if (color) out.color = color
  const style = engine.style?.[0]?.trim()
  if (style) out.style = style
  const namingAddon = engine.namingAddon?.[0]?.trim()
  if (namingAddon) out.namingAddon = namingAddon
  if (engine.categoryId?.length) out.categoryId = engine.categoryId
  return out
}

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

  // Convert the engine's all-array filters back to the app shape before fetch.
  const adaptedListFn = useCallback(
    (input: ListInput<EngineProductsFilters>) =>
      listProductsRequest({
        ...input,
        filters: input.filters ? toAppFilters(input.filters) : undefined,
      }),
    [],
  )

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
  } = useFetchListController<ProductListRow, EngineProductsFilters>({
    mode: "fetch",
    queryKey: [...PRODUCTS_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_PRODUCTS_PAGE_SIZE,
    tableKey: "products-main",
    filterableFields: PRODUCTS_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const prodNumberValue = filters.prodNumber?.[0] ?? ""
  const colorValue = filters.color?.[0] ?? ""
  const styleValue = filters.style?.[0] ?? ""
  const namingAddonValue = filters.namingAddon?.[0] ?? ""

  const handleProdNumberChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("prodNumber", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const handleColorChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("color", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const handleStyleChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("style", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const handleNamingAddonChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("namingAddon", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const selectedCategoryId = useMemo(() => {
    const ids = filters.categoryId
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
    if (prodNumberValue.trim().length > 0) return true
    if (colorValue.trim().length > 0) return true
    if (styleValue.trim().length > 0) return true
    if (namingAddonValue.trim().length > 0) return true
    if (selectedCategoryId) return true
    return false
  }, [
    searchQuery,
    prodNumberValue,
    colorValue,
    styleValue,
    namingAddonValue,
    selectedCategoryId,
  ])

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  // Exact record-number search (PROD #) lives in the table's gutter
  // TableOptions menu, not the toolbar — mirrors inventory's "Sort" tab.
  const tableOptions = useMemo<TableOptionsConfig>(
    () => ({
      tabs: [
        {
          key: "number",
          label: "PROD #",
          active: prodNumberValue.trim().length > 0,
          render: () => (
            <DebouncedSearchControl
              value={prodNumberValue}
              onCommit={handleProdNumberChange}
              placeholder="PROD #"
              ariaLabel="Search products by product number"
            />
          ),
        },
      ],
    }),
    [prodNumberValue, handleProdNumberChange],
  )

  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="mx-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
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
          <ListToolbar className="pt-0" showDivider={false}>
            {/* Search + (Clear all | row count) — encased card attached to the tab above */}
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <ProductsListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <DebouncedSearchControl
                  value={colorValue}
                  onCommit={handleColorChange}
                  placeholder="Color"
                  ariaLabel="Search products by color"
                />
                <DebouncedSearchControl
                  value={styleValue}
                  onCommit={handleStyleChange}
                  placeholder="Style"
                  ariaLabel="Search products by style"
                />
                <DebouncedSearchControl
                  value={namingAddonValue}
                  onCommit={handleNamingAddonChange}
                  placeholder="Naming addon"
                  ariaLabel="Search products by naming addon"
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
      </div>

      <ProductsTable
        rows={rows}
        onOpenProduct={openProduct}
        tableOptions={tableOptions}
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
  )
}
