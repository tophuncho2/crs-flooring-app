"use client"

import { useCallback, useMemo } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import {
  DebouncedSearchControl,
  NumberSearchTabBody,
  SearchControl,
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ListPageFeedback,
  ToolbarMenuButton,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
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
import { CategoryFilterChip } from "./toolbar-controls/category-filter-chip"

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

  // Each tool lights its own dot independently; `hasActiveFilters` stays the
  // ListActionBar clear-all signal. Filter = the Category attribute; Search =
  // full-text + PROD # + the color/style/naming free-text bars.
  const hasActiveFilterTool = useMemo(
    () => Boolean(selectedCategoryId),
    [selectedCategoryId],
  )

  const hasActiveSearchTool = useMemo(
    () =>
      searchQuery.trim().length > 0 ||
      prodNumberValue.trim().length > 0 ||
      colorValue.trim().length > 0 ||
      styleValue.trim().length > 0 ||
      namingAddonValue.trim().length > 0,
    [searchQuery, prodNumberValue, colorValue, styleValue, namingAddonValue],
  )

  return (
    <ListPageShell>
      <ListCreateButtonPortal label="Product" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Products"
        rowCount={rows.length}
        total={total}
        rowCountLabel="products"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        {/* Filter — products HAS one. The Category attribute picker, composed
            directly (NOT the self-triggering FilterControl). */}
        <ToolbarMenuButton
          label="Filter"
          icon={SlidersHorizontal}
          active={hasActiveFilterTool}
        >
          <CategoryFilterChip
            value={selectedCategoryId}
            selectedLabel={selectedCategoryLabel}
            onChange={handleCategoryChange}
            initialOptions={initialCategoryOptions}
          />
        </ToolbarMenuButton>

        {/* Search — full-text + PROD # exact number + the color/style/naming
            free-text bars, mirrors job-types. */}
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={hasActiveSearchTool}
        >
          <SearchControl
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
            placeholder="Search products"
          />
          <NumberSearchTabBody
            value={prodNumberValue}
            onChange={handleProdNumberChange}
            placeholder="PROD #"
            ariaLabel="Search products by product number"
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
        </ToolbarMenuButton>
      </ListActionBar>

      <ProductsTable
        rows={rows}
        onOpenProduct={openProduct}
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
