"use client"

import { useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react"
import {
  DebouncedSearchControl,
  FilterGroupLabel,
  ListActionBar,
  ListPageShell,
  SortMenuBody,
  ToolbarMenuButton,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import type { ListInput } from "@builders/application"
import {
  INVENTORY_INDICATORS_LIST_PAGE_SIZE,
  PRODUCT_SEARCH_KEYS,
  type CategoryOption,
  type InventoryIndicatorListFilters,
  type InventoryIndicatorRow,
  type ProductOption,
  type ProductSearchKey,
  type WarehouseOption,
} from "@builders/domain"
import { FilterPickerChip, usePickedOptionLabel } from "@/engines/picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import { ProductSearchControls } from "@/modules/products/components/list/product-search-controls"
import { useRecordEntryNavigation } from "@/hooks/navigation/use-record-entry-navigation"
import {
  INDICATORS_LIST_QUERY_KEY,
  listIndicatorsRequest,
} from "@/modules/inventory-indicators/data/list-inventory-indicators-request"
import {
  INDICATORS_ALLOWED_SORT_FIELDS,
  INDICATORS_MAX_SORT_LEVELS,
  INDICATORS_SORT_OPTIONS,
} from "./table/inventory-indicators-list-columns"
import { InventoryIndicatorsTable } from "./inventory-indicators-table"

const INDICATORS_FILTERABLE_FIELDS = [
  "warehouseId",
  "productId",
  "categoryId",
  "indicatorNumber",
  ...PRODUCT_SEARCH_KEYS,
] as const

type EngineIndicatorFilters = {
  warehouseId?: ReadonlyArray<string>
  productId?: ReadonlyArray<string>
  categoryId?: ReadonlyArray<string>
  indicatorNumber?: ReadonlyArray<string>
} & Partial<Record<ProductSearchKey, ReadonlyArray<string>>>

function toEngineFilters(app: InventoryIndicatorListFilters): EngineIndicatorFilters {
  const out: EngineIndicatorFilters = {}
  if (app.warehouseId?.length) out.warehouseId = app.warehouseId
  if (app.productId?.length) out.productId = app.productId
  if (app.categoryId?.length) out.categoryId = app.categoryId
  if (app.indicatorNumber && app.indicatorNumber.length > 0) {
    out.indicatorNumber = [app.indicatorNumber]
  }
  for (const key of PRODUCT_SEARCH_KEYS) {
    const value = app[key]?.trim()
    if (value) out[key] = [value]
  }
  return out
}

function toAppFilters(engine: EngineIndicatorFilters): InventoryIndicatorListFilters {
  const out: InventoryIndicatorListFilters = {}
  if (engine.warehouseId?.length) out.warehouseId = engine.warehouseId
  if (engine.productId?.length) out.productId = engine.productId
  if (engine.categoryId?.length) out.categoryId = engine.categoryId
  const indicatorNumber = engine.indicatorNumber?.[0]?.trim()
  if (indicatorNumber) out.indicatorNumber = indicatorNumber
  for (const key of PRODUCT_SEARCH_KEYS) {
    const value = engine[key]?.[0]?.trim()
    if (value) out[key] = value
  }
  return out
}

export default function InventoryIndicatorsClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialWarehouseOptions,
  initialSelectedWarehouse = null,
  initialCategoryOptions,
  initialSelectedCategory = null,
  initialSelectedProduct = null,
}: {
  initialSearchQuery: string
  initialPage: number
  initialFilters: InventoryIndicatorListFilters
  initialWarehouseOptions: WarehouseOption[]
  initialSelectedWarehouse?: WarehouseOption | null
  initialCategoryOptions: CategoryOption[]
  initialSelectedCategory?: CategoryOption | null
  initialSelectedProduct?: ProductOption | null
}) {
  const router = useRouter()
  // Rows open the parent product's record view (its Inventory Indicators section
  // is inline-editable). `returnTo` brings the user back to this list on close.
  const { returnTo } = useRecordEntryNavigation("/dashboard/inventory-indicators")

  const adaptedListFn = useCallback(
    (input: ListInput<EngineIndicatorFilters>) =>
      listIndicatorsRequest({
        ...input,
        filters: input.filters ? toAppFilters(input.filters) : undefined,
      }),
    [],
  )

  const {
    rows,
    total,
    filters,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    sorts,
    hasNonDefaultSort,
    onSortsChange,
    onFilterChange,
    onClearAllFilters,
    columnWidths,
    onColumnWidthsChange,
  } = useFetchListController<InventoryIndicatorRow, EngineIndicatorFilters>({
    mode: "fetch",
    queryKey: [...INDICATORS_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: INVENTORY_INDICATORS_LIST_PAGE_SIZE,
    tableKey: "inventory-indicators-main",
    filterableFields: INDICATORS_FILTERABLE_FIELDS,
    allowedSortFields: INDICATORS_ALLOWED_SORT_FIELDS,
    maxSortLevels: INDICATORS_MAX_SORT_LEVELS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const selectedWarehouseId = filters.warehouseId?.[0] ?? null
  const selectedCategoryId = filters.categoryId?.[0] ?? null
  const selectedProductId = filters.productId?.[0] ?? null
  const indicatorNumberValue = filters.indicatorNumber?.[0] ?? ""

  // Shared product-attribute search bars (resolve through the product join).
  const productSearchValues = useMemo(
    () => ({
      prodNumber: filters.prodNumber?.[0] ?? "",
      color: filters.color?.[0] ?? "",
      style: filters.style?.[0] ?? "",
      namingAddon: filters.namingAddon?.[0] ?? "",
    }),
    [filters],
  )
  const hasActiveProductSearch = useMemo(
    () => Object.values(productSearchValues).some((value) => value.trim().length > 0),
    [productSearchValues],
  )

  const warehouseLabel = useMemo(() => {
    if (!selectedWarehouseId) return null
    if (initialSelectedWarehouse?.id === selectedWarehouseId) {
      return initialSelectedWarehouse.name
    }
    return initialWarehouseOptions.find((o) => o.id === selectedWarehouseId)?.name ?? null
  }, [selectedWarehouseId, initialSelectedWarehouse, initialWarehouseOptions])

  const categoryLabel = useMemo(() => {
    if (!selectedCategoryId) return null
    if (initialSelectedCategory?.id === selectedCategoryId) {
      return initialSelectedCategory.name
    }
    return initialCategoryOptions.find((o) => o.id === selectedCategoryId)?.name ?? null
  }, [selectedCategoryId, initialSelectedCategory, initialCategoryOptions])

  const productLabel = useMemo(() => {
    if (!selectedProductId) return null
    return initialSelectedProduct?.id === selectedProductId ? initialSelectedProduct.name : null
  }, [selectedProductId, initialSelectedProduct])

  const warehouseFilter = usePickedOptionLabel<WarehouseOption>(
    selectedWarehouseId,
    warehouseLabel,
    (option) => option.name,
  )
  const categoryFilter = usePickedOptionLabel<CategoryOption>(
    selectedCategoryId,
    categoryLabel,
    (option) => option.name,
  )
  const productFilter = usePickedOptionLabel<ProductOption>(
    selectedProductId,
    productLabel,
    (option) => option.name,
  )

  const handleWarehouseChange = useCallback(
    (id: string | null) => {
      onFilterChange("warehouseId", id ? [id] : [])
    },
    [onFilterChange],
  )

  // Category gates Product scope; changing category cascade-clears the product
  // selection. Mirrors the inventory/adjustments list chips.
  const handleCategoryChange = useCallback(
    (id: string | null) => {
      onFilterChange("categoryId", id ? [id] : [])
      onFilterChange("productId", [])
    },
    [onFilterChange],
  )

  const handleProductChange = useCallback(
    (id: string | null) => {
      onFilterChange("productId", id ? [id] : [])
    },
    [onFilterChange],
  )

  const handleIndicatorNumberChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("indicatorNumber", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  // Shared product-attribute search bars — same 1-element-array encoding.
  const handleProductSearchChange = useCallback(
    (key: ProductSearchKey, next: string) => {
      const trimmed = next.trim()
      onFilterChange(key, trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilterTool = useMemo(
    () => Boolean(selectedWarehouseId) || Boolean(selectedCategoryId) || Boolean(selectedProductId),
    [selectedWarehouseId, selectedCategoryId, selectedProductId],
  )
  const hasActiveSearchTool = Boolean(indicatorNumberValue) || hasActiveProductSearch
  const hasActiveSortTool = hasNonDefaultSort

  const hasActiveFilters = useMemo(
    () => hasActiveFilterTool || hasActiveSearchTool || hasActiveSortTool,
    [hasActiveFilterTool, hasActiveSearchTool, hasActiveSortTool],
  )

  const handleOpenIndicator = useCallback(
    (row: InventoryIndicatorRow) => {
      const params = new URLSearchParams()
      if (returnTo) params.set("returnTo", returnTo)
      const query = params.toString()
      router.push(`/dashboard/products/${row.productId}${query ? `?${query}` : ""}`, {
        scroll: false,
      })
    },
    [router, returnTo],
  )

  return (
    <ListPageShell fill>
      <ListActionBar
        label="Inventory Indicators"
        hasActiveFilters={hasActiveFilters}
        onClearAll={onClearAllFilters}
      >
        <ToolbarMenuButton
          label="Sort"
          title="Sort by"
          icon={ArrowUpDown}
          active={hasActiveSortTool}
          bodyClassName="w-auto"
        >
          <SortMenuBody
            options={INDICATORS_SORT_OPTIONS}
            value={sorts}
            maxLevels={INDICATORS_MAX_SORT_LEVELS}
            onChange={onSortsChange}
          />
        </ToolbarMenuButton>

        <ToolbarMenuButton label="Filter" icon={SlidersHorizontal} active={hasActiveFilterTool}>
          <FilterPickerChip<WarehouseOption>
            value={selectedWarehouseId}
            onChange={handleWarehouseChange}
            selectedLabel={warehouseFilter.selectedLabel}
            onOptionSelected={warehouseFilter.onOptionSelected}
            nounSingular="Warehouse"
            nounPlural="warehouses"
            subject="indicators"
          >
            {(chrome) => <WarehousePicker {...chrome} initialOptions={initialWarehouseOptions} />}
          </FilterPickerChip>
          <FilterPickerChip<CategoryOption>
            value={selectedCategoryId}
            onChange={handleCategoryChange}
            selectedLabel={categoryFilter.selectedLabel}
            onOptionSelected={categoryFilter.onOptionSelected}
            nounSingular="Category"
            nounPlural="categories"
            subject="indicators"
          >
            {(chrome) => <CategoryPicker {...chrome} initialOptions={initialCategoryOptions} />}
          </FilterPickerChip>
          <FilterPickerChip<ProductOption>
            value={selectedProductId}
            onChange={handleProductChange}
            selectedLabel={productFilter.selectedLabel}
            onOptionSelected={productFilter.onOptionSelected}
            nounSingular="Product"
            nounPlural="products"
            subject="indicators"
          >
            {(chrome) => <ProductPicker {...chrome} categoryId={selectedCategoryId} />}
          </FilterPickerChip>
        </ToolbarMenuButton>

        {/* Search — two grouped columns (Identity | Product) in a 2-column grid,
            mirroring the WO Filter menu. Product bars resolve through the product
            join and share their source with the Products list. */}
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={hasActiveSearchTool}
          bodyClassName="w-[30rem]"
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex flex-col gap-2">
              <FilterGroupLabel>Identity</FilterGroupLabel>
              <DebouncedSearchControl
                value={indicatorNumberValue}
                onCommit={handleIndicatorNumberChange}
                placeholder="Indicator #"
                ariaLabel="Search indicators by indicator number"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FilterGroupLabel>Product</FilterGroupLabel>
              <ProductSearchControls
                values={productSearchValues}
                onChange={handleProductSearchChange}
                subject="indicators"
              />
            </div>
          </div>
        </ToolbarMenuButton>
      </ListActionBar>

      <InventoryIndicatorsTable
        rows={rows}
        onOpenIndicator={handleOpenIndicator}
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
