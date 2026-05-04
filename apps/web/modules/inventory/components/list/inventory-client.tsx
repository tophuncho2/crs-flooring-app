"use client"

import { useCallback, useMemo } from "react"
import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { useServerListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { InventoryListFilters } from "@builders/application"
import {
  LIST_INVENTORY_PAGE_SIZE,
  type CategoryOption,
  type InventoryRow,
  type LocationOption,
  type ProductOption,
  type SectionOption,
  type TablePreferencePayload,
  type WarehouseOption,
} from "@builders/domain"
import {
  INVENTORY_LIST_QUERY_KEY,
  listInventoryRequest,
} from "@/modules/inventory/data/list-inventory-request"
import { useInventoryListController } from "@/modules/inventory/controllers/use-inventory-list-controller"
import { InventoryTable } from "./inventory-table"
import { CategoryFilterChip } from "./category-filter-chip"
import { LocationFilterChip } from "./location-filter-chip"
import { ProductFilterChip } from "./product-filter-chip"
import { SectionFilterChip } from "./section-filter-chip"
import { WarehouseFilterChip } from "./warehouse-filter-chip"

const INVENTORY_FILTERABLE_FIELDS = [
  "warehouseId",
  "sectionId",
  "locationId",
  "categoryId",
  "productId",
] as const

export default function InventoryClient({
  initialTablePreferences,
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialWarehouseOptions,
  initialSelectedWarehouse = null,
  initialSelectedSection = null,
  initialSelectedLocation = null,
  initialCategoryOptions,
  initialSelectedCategory = null,
  initialSelectedProduct = null,
}: {
  initialTablePreferences?: TablePreferencePayload | null
  initialSearchQuery: string
  initialPage: number
  initialFilters: InventoryListFilters
  initialWarehouseOptions: WarehouseOption[]
  initialSelectedWarehouse?: WarehouseOption | null
  initialSelectedSection?: SectionOption | null
  initialSelectedLocation?: LocationOption | null
  initialCategoryOptions: CategoryOption[]
  initialSelectedCategory?: CategoryOption | null
  initialSelectedProduct?: ProductOption | null
}) {
  const { message, pageError, openInventory } = useInventoryListController()

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
  } = useServerListController<InventoryRow, InventoryListFilters>({
    mode: "fetch",
    queryKey: [...INVENTORY_LIST_QUERY_KEY],
    listFn: listInventoryRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: LIST_INVENTORY_PAGE_SIZE,
    tableKey: "inventory-main",
    initialTablePreferences,
    filterableFields: INVENTORY_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  // --- Resolve currently-selected ids from the engine's filter map ---
  const filtersTyped = filters as InventoryListFilters
  const selectedWarehouseId = filtersTyped.warehouseId?.[0] ?? null
  const selectedSectionId = filtersTyped.sectionId?.[0] ?? null
  const selectedLocationId = filtersTyped.locationId?.[0] ?? null
  const selectedCategoryId = filtersTyped.categoryId?.[0] ?? null
  const selectedProductId = filtersTyped.productId?.[0] ?? null

  // --- Selected-label snapshots ---
  // Each chip needs a label so its trigger renders the picked entity name on
  // first paint without a refetch. The page loader resolves the initial label
  // (when a filter is preset in the URL); after that the snapshot stays fresh
  // because the picker's onChange fires on every selection — but pickers don't
  // give us the picked option here, so we look up from the seed when possible
  // and fall back to the initial selected snapshot when the id matches.

  const warehouseLabel = useMemo(() => {
    if (!selectedWarehouseId) return null
    if (initialSelectedWarehouse?.id === selectedWarehouseId) {
      return initialSelectedWarehouse.name
    }
    return initialWarehouseOptions.find((o) => o.id === selectedWarehouseId)?.name ?? null
  }, [selectedWarehouseId, initialSelectedWarehouse, initialWarehouseOptions])

  const sectionLabel = useMemo(() => {
    if (!selectedSectionId) return null
    return initialSelectedSection?.id === selectedSectionId
      ? initialSelectedSection.label
      : null
  }, [selectedSectionId, initialSelectedSection])

  const locationLabel = useMemo(() => {
    if (!selectedLocationId) return null
    return initialSelectedLocation?.id === selectedLocationId
      ? initialSelectedLocation.shortCode
      : null
  }, [selectedLocationId, initialSelectedLocation])

  const categoryLabel = useMemo(() => {
    if (!selectedCategoryId) return null
    if (initialSelectedCategory?.id === selectedCategoryId) {
      return initialSelectedCategory.name
    }
    return initialCategoryOptions.find((o) => o.id === selectedCategoryId)?.name ?? null
  }, [selectedCategoryId, initialSelectedCategory, initialCategoryOptions])

  const productLabel = useMemo(() => {
    if (!selectedProductId) return null
    return initialSelectedProduct?.id === selectedProductId
      ? initialSelectedProduct.name
      : null
  }, [selectedProductId, initialSelectedProduct])

  // --- Cascade-clear filter handlers ---
  // Warehouse change → also clear Section + Location (their picker scope is
  // gone). Section change → clear Location. Category change → clear Product.

  const handleWarehouseChange = useCallback(
    (id: string | null) => {
      onFilterChange("warehouseId", id ? [id] : [])
      onFilterChange("sectionId", [])
      onFilterChange("locationId", [])
    },
    [onFilterChange],
  )

  const handleSectionChange = useCallback(
    (id: string | null) => {
      onFilterChange("sectionId", id ? [id] : [])
      onFilterChange("locationId", [])
    },
    [onFilterChange],
  )

  const handleLocationChange = useCallback(
    (id: string | null) => {
      onFilterChange("locationId", id ? [id] : [])
    },
    [onFilterChange],
  )

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

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader title="Inventory" />

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
              placeholder="Search inv #, item #, dye lot"
            />
          </div>

          {/* Location chain: Warehouse → Section → Location */}
          <WarehouseFilterChip
            value={selectedWarehouseId}
            selectedLabel={warehouseLabel}
            onChange={handleWarehouseChange}
            initialOptions={initialWarehouseOptions}
          />
          <SectionFilterChip
            value={selectedSectionId}
            selectedLabel={sectionLabel}
            warehouseId={selectedWarehouseId}
            onChange={handleSectionChange}
          />
          <LocationFilterChip
            value={selectedLocationId}
            selectedLabel={locationLabel}
            warehouseId={selectedWarehouseId}
            sectionId={selectedSectionId}
            onChange={handleLocationChange}
          />

          {/* Visual gap separating the location chain from the product chain */}
          <span aria-hidden="true" className="mx-1 h-6 w-px bg-[var(--panel-border)]" />

          {/* Product chain: Category → Product */}
          <CategoryFilterChip
            value={selectedCategoryId}
            selectedLabel={categoryLabel}
            onChange={handleCategoryChange}
            initialOptions={initialCategoryOptions}
          />
          <ProductFilterChip
            value={selectedProductId}
            selectedLabel={productLabel}
            categoryId={selectedCategoryId}
            onChange={handleProductChange}
          />

          <span className="text-xs text-[var(--foreground)]/55">
            {rows.length} of {total} inventory rows
          </span>
        </div>

        <InventoryTable
          rows={rows}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={total}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onOpenInventory={openInventory}
        />
      </div>
    </div>
  )
}
