"use client"

import { useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react"
import {
  DebouncedSearchControl,
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
  type InventoryIndicatorListFilters,
  type InventoryIndicatorRow,
  type ProductOption,
  type WarehouseOption,
} from "@builders/domain"
import { FilterPickerChip, usePickedOptionLabel } from "@/engines/picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
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

const INDICATORS_FILTERABLE_FIELDS = ["warehouseId", "productId", "indicatorNumber"] as const

type EngineIndicatorFilters = {
  warehouseId?: ReadonlyArray<string>
  productId?: ReadonlyArray<string>
  indicatorNumber?: ReadonlyArray<string>
}

function toEngineFilters(app: InventoryIndicatorListFilters): EngineIndicatorFilters {
  const out: EngineIndicatorFilters = {}
  if (app.warehouseId?.length) out.warehouseId = app.warehouseId
  if (app.productId?.length) out.productId = app.productId
  if (app.indicatorNumber && app.indicatorNumber.length > 0) {
    out.indicatorNumber = [app.indicatorNumber]
  }
  return out
}

function toAppFilters(engine: EngineIndicatorFilters): InventoryIndicatorListFilters {
  const out: InventoryIndicatorListFilters = {}
  if (engine.warehouseId?.length) out.warehouseId = engine.warehouseId
  if (engine.productId?.length) out.productId = engine.productId
  const indicatorNumber = engine.indicatorNumber?.[0]?.trim()
  if (indicatorNumber) out.indicatorNumber = indicatorNumber
  return out
}

export default function InventoryIndicatorsClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialWarehouseOptions,
  initialSelectedWarehouse = null,
  initialSelectedProduct = null,
}: {
  initialSearchQuery: string
  initialPage: number
  initialFilters: InventoryIndicatorListFilters
  initialWarehouseOptions: WarehouseOption[]
  initialSelectedWarehouse?: WarehouseOption | null
  initialSelectedProduct?: ProductOption | null
}) {
  const router = useRouter()
  // Rows open into the parent product's record view, drilled into the indicators
  // section at that row (`?indicator=<id>`). `returnTo` brings the user back here.
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
    initialSort: { field: "createdAt", direction: "desc" },
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
  const selectedProductId = filters.productId?.[0] ?? null
  const indicatorNumberValue = filters.indicatorNumber?.[0] ?? ""

  const warehouseLabel = useMemo(() => {
    if (!selectedWarehouseId) return null
    if (initialSelectedWarehouse?.id === selectedWarehouseId) {
      return initialSelectedWarehouse.name
    }
    return initialWarehouseOptions.find((o) => o.id === selectedWarehouseId)?.name ?? null
  }, [selectedWarehouseId, initialSelectedWarehouse, initialWarehouseOptions])

  const productLabel = useMemo(() => {
    if (!selectedProductId) return null
    return initialSelectedProduct?.id === selectedProductId ? initialSelectedProduct.name : null
  }, [selectedProductId, initialSelectedProduct])

  const warehouseFilter = usePickedOptionLabel<WarehouseOption>(
    selectedWarehouseId,
    warehouseLabel,
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

  const hasActiveFilterTool = useMemo(
    () => Boolean(selectedWarehouseId) || Boolean(selectedProductId),
    [selectedWarehouseId, selectedProductId],
  )
  const hasActiveSearchTool = Boolean(indicatorNumberValue)
  const hasActiveSortTool = hasNonDefaultSort

  const hasActiveFilters = useMemo(
    () => hasActiveFilterTool || hasActiveSearchTool || hasActiveSortTool,
    [hasActiveFilterTool, hasActiveSearchTool, hasActiveSortTool],
  )

  const handleOpenIndicator = useCallback(
    (row: InventoryIndicatorRow) => {
      const params = new URLSearchParams()
      params.set("indicator", row.id)
      if (returnTo) params.set("returnTo", returnTo)
      router.push(`/dashboard/products/${row.productId}?${params.toString()}`, { scroll: false })
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
          <FilterPickerChip<ProductOption>
            value={selectedProductId}
            onChange={handleProductChange}
            selectedLabel={productFilter.selectedLabel}
            onOptionSelected={productFilter.onOptionSelected}
            nounSingular="Product"
            nounPlural="products"
            subject="indicators"
          >
            {(chrome) => <ProductPicker {...chrome} categoryId={null} />}
          </FilterPickerChip>
        </ToolbarMenuButton>

        <ToolbarMenuButton label="Search" icon={Search} active={hasActiveSearchTool}>
          <DebouncedSearchControl
            value={indicatorNumberValue}
            onCommit={handleIndicatorNumberChange}
            placeholder="Indicator #"
            ariaLabel="Search indicators by indicator number"
          />
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
