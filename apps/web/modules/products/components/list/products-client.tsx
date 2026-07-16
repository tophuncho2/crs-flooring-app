"use client"

import { useCallback, useMemo } from "react"
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react"
import {
  SearchControl,
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ListPageFeedback,
  SortMenuBody,
  ToolbarMenuButton,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import { FilterPickerChip, usePickedOptionLabel } from "@/engines/picker"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import type { ListInput, ProductsListFilters } from "@builders/application"
import {
  LIST_PRODUCTS_PAGE_SIZE,
  type CategoryOption,
  type ProductListRow,
  type ProductSearchKey,
} from "@builders/domain"
import { ProductSearchControls } from "./product-search-controls"
import { ArchiveSegmentedControl } from "./toolbar-controls/archive-segmented-control"
import {
  PRODUCTS_LIST_QUERY_KEY,
  listProductsRequest,
} from "@/modules/products/data/list-products-request"
import { useProductsListController } from "@/modules/products/controllers/use-products-list-controller"
import {
  PRODUCTS_ALLOWED_SORT_FIELDS,
  PRODUCTS_MAX_SORT_LEVELS,
  PRODUCTS_SORT_OPTIONS,
} from "./table/products-list-columns"
import { ProductsTable } from "./products-table"

const PRODUCTS_FILTERABLE_FIELDS = [
  "prodNumber",
  "color",
  "style",
  "namingAddon",
  "categoryId",
  "isArchived",
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
  // Boolean archive flag boxed as a 1-element string array (the engine filter
  // map only carries `string[]`), same as inventory.
  isArchived?: ReadonlyArray<string>
}

function toEngineFilters(app: ProductsListFilters): EngineProductsFilters {
  const out: EngineProductsFilters = {}
  if (app.prodNumber && app.prodNumber.length > 0) out.prodNumber = [app.prodNumber]
  if (app.color && app.color.length > 0) out.color = [app.color]
  if (app.style && app.style.length > 0) out.style = [app.style]
  if (app.namingAddon && app.namingAddon.length > 0) out.namingAddon = [app.namingAddon]
  if (app.categoryId?.length) out.categoryId = app.categoryId
  if (app.isArchived !== undefined) out.isArchived = [app.isArchived ? "true" : "false"]
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
  const arch = engine.isArchived?.[0]
  if (arch === "true") out.isArchived = true
  else if (arch === "false") out.isArchived = false
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
    sorts,
    hasNonDefaultSort,
    onSortsChange,
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
    columnWidths,
    onColumnWidthsChange,
  } = useFetchListController<ProductListRow, EngineProductsFilters>({
    mode: "fetch",
    queryKey: [...PRODUCTS_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    // No client sort seed: an empty sort falls through to the server's uniform
    // base order (createdAt desc, id desc). Category grouping is one Sort-menu
    // click away and now persists across navigations.
    allowedSortFields: PRODUCTS_ALLOWED_SORT_FIELDS,
    maxSortLevels: PRODUCTS_MAX_SORT_LEVELS,
    pageSize: LIST_PRODUCTS_PAGE_SIZE,
    tableKey: "products-main",
    filterableFields: PRODUCTS_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const prodNumberValue = filters.prodNumber?.[0] ?? ""
  const colorValue = filters.color?.[0] ?? ""
  const styleValue = filters.style?.[0] ?? ""
  const namingAddonValue = filters.namingAddon?.[0] ?? ""

  const productSearchValues = useMemo(
    () => ({
      prodNumber: prodNumberValue,
      color: colorValue,
      style: styleValue,
      namingAddon: namingAddonValue,
    }),
    [prodNumberValue, colorValue, styleValue, namingAddonValue],
  )

  const handleProductSearchChange = useCallback(
    (key: ProductSearchKey, next: string) => {
      const trimmed = next.trim()
      onFilterChange(key, trimmed.length > 0 ? [trimmed] : [])
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

  const categoryFilter = usePickedOptionLabel<CategoryOption>(
    selectedCategoryId,
    selectedCategoryLabel,
    (option) => option.name,
  )

  const handleCategoryChange = useCallback(
    (id: string | null) => {
      onFilterChange("categoryId", id ? [id] : [])
    },
    [onFilterChange],
  )

  // Archive status — absent/`false` both render as Active (the default); only an
  // explicit `true` shows archived-only. Boxed as a 1-element string array.
  const isArchivedValue = filters.isArchived?.[0] === "true"

  const handleArchivedChange = useCallback(
    (next: boolean) => {
      onFilterChange("isArchived", [next ? "true" : "false"])
    },
    [onFilterChange],
  )

  // An active user sort folds into the single "Clear all" signal; the Sort menu
  // no longer carries its own Clear.
  const hasActiveSortTool = hasNonDefaultSort

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (prodNumberValue.trim().length > 0) return true
    if (colorValue.trim().length > 0) return true
    if (styleValue.trim().length > 0) return true
    if (namingAddonValue.trim().length > 0) return true
    if (selectedCategoryId) return true
    if (isArchivedValue) return true
    if (hasActiveSortTool) return true
    return false
  }, [
    searchQuery,
    prodNumberValue,
    colorValue,
    styleValue,
    namingAddonValue,
    selectedCategoryId,
    isArchivedValue,
    hasActiveSortTool,
  ])

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  // Each tool lights its own dot independently; `hasActiveFilters` stays the
  // ListActionBar clear-all signal. Filter = the Category attribute; Search =
  // full-text + PROD # + the color/style/naming free-text bars.
  const hasActiveFilterTool = useMemo(
    () => Boolean(selectedCategoryId) || isArchivedValue,
    [selectedCategoryId, isArchivedValue],
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
    <ListPageShell fill>
      <ListCreateButtonPortal label="Product" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Products"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        {/* Sort — the shared multi-column Sort menu. Menu-only: the table
            headers stay static labels. */}
        <ToolbarMenuButton
          label="Sort"
          title="Sort by"
          icon={ArrowUpDown}
          active={hasActiveSortTool}
          bodyClassName="w-auto"
        >
          <SortMenuBody
            options={PRODUCTS_SORT_OPTIONS}
            value={sorts}
            maxLevels={PRODUCTS_MAX_SORT_LEVELS}
            onChange={onSortsChange}
          />
        </ToolbarMenuButton>

        {/* Filter — the Category attribute picker + the archive status control.
            Category composed directly (NOT the self-triggering FilterControl). */}
        <ToolbarMenuButton
          label="Filter"
          icon={SlidersHorizontal}
          active={hasActiveFilterTool}
        >
          <FilterPickerChip<CategoryOption>
            value={selectedCategoryId}
            onChange={handleCategoryChange}
            selectedLabel={categoryFilter.selectedLabel}
            onOptionSelected={categoryFilter.onOptionSelected}
            nounSingular="Category"
            nounPlural="categories"
            subject="products"
          >
            {(chrome) => (
              <CategoryPicker {...chrome} initialOptions={initialCategoryOptions} />
            )}
          </FilterPickerChip>
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-[var(--foreground)]/60">Status</p>
            <ArchiveSegmentedControl value={isArchivedValue} onChange={handleArchivedChange} />
          </div>
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
          <ProductSearchControls
            values={productSearchValues}
            onChange={handleProductSearchChange}
            subject="products"
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
        columnWidths={columnWidths}
        onColumnWidthsChange={onColumnWidthsChange}
      />
    </ListPageShell>
  )
}
