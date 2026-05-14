"use client"

import { useCallback, useMemo } from "react"
import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { ClearAllFiltersButton } from "@/components/features/filter"
import {
  ListRowCount,
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
  ListToolbarTallCard,
} from "@/components/features/list-toolbar"
import { useServerListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { InventoryListFilters, ListInput } from "@builders/application"
import {
  LIST_INVENTORY_PAGE_SIZE,
  type CategoryOption,
  type InventoryRow,
  type ProductOption,
  type TablePreferencePayload,
  type WarehouseOption,
} from "@builders/domain"
import {
  INVENTORY_LIST_QUERY_KEY,
  listInventoryRequest,
} from "@/modules/inventory/data/list-inventory-request"
import { useInventoryListController } from "@/modules/inventory/controllers/use-inventory-list-controller"
import { InventoryTable } from "./inventory-table"
import { LocationPicker } from "@/modules/inventory/components/picker/location-picker"
import { ArchiveSegmentedControl } from "./archive-segmented-control"
import { CategoryFilterChip } from "./category-filter-chip"
import { ImportNumberFilterChip } from "./import-number-filter-chip"
import { ProductFilterChip } from "./product-filter-chip"
import { PurchaseOrderFilterChip } from "./purchase-order-filter-chip"
import { WarehouseFilterChip } from "./warehouse-filter-chip"

const INVENTORY_FILTERABLE_FIELDS = [
  "warehouseId",
  "categoryId",
  "productId",
  "location",
  "isArchived",
] as const

/**
 * Engine-side filter shape: the list-view engine's filter map only carries
 * `string[]` values (one per filterable field). For the inventory list's
 * non-array filters — `location` (free text) and `isArchived` (boolean) — we
 * encode them as 1-element string arrays here, then translate to the typed
 * `InventoryListFilters` at the listFn boundary below.
 */
type EngineInventoryFilters = {
  warehouseId?: ReadonlyArray<string>
  categoryId?: ReadonlyArray<string>
  productId?: ReadonlyArray<string>
  location?: ReadonlyArray<string>
  isArchived?: ReadonlyArray<string>
}

function toEngineFilters(app: InventoryListFilters): EngineInventoryFilters {
  const out: EngineInventoryFilters = {}
  if (app.warehouseId?.length) out.warehouseId = app.warehouseId
  if (app.categoryId?.length) out.categoryId = app.categoryId
  if (app.productId?.length) out.productId = app.productId
  if (app.location && app.location.length > 0) out.location = [app.location]
  if (app.isArchived !== undefined) out.isArchived = [app.isArchived ? "true" : "false"]
  return out
}

function toAppFilters(engine: EngineInventoryFilters): InventoryListFilters {
  const out: InventoryListFilters = {}
  if (engine.warehouseId?.length) out.warehouseId = engine.warehouseId
  if (engine.categoryId?.length) out.categoryId = engine.categoryId
  if (engine.productId?.length) out.productId = engine.productId
  const loc = engine.location?.[0]?.trim()
  if (loc) out.location = loc
  const arch = engine.isArchived?.[0]
  if (arch === "true") out.isArchived = true
  else if (arch === "false") out.isArchived = false
  return out
}

export default function InventoryClient({
  initialTablePreferences,
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialWarehouseOptions,
  initialSelectedWarehouse = null,
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
  initialCategoryOptions: CategoryOption[]
  initialSelectedCategory?: CategoryOption | null
  initialSelectedProduct?: ProductOption | null
}) {
  const { message, pageError, openInventory } = useInventoryListController()

  // The engine's filter map carries `string[]` only — translate to typed
  // InventoryListFilters at the listFn boundary so the application layer
  // sees `location: string` and `isArchived: boolean`.
  const adaptedListFn = useCallback(
    (input: ListInput<EngineInventoryFilters>) =>
      listInventoryRequest({
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
  } = useServerListController<InventoryRow, EngineInventoryFilters>({
    mode: "fetch",
    queryKey: [...INVENTORY_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_INVENTORY_PAGE_SIZE,
    tableKey: "inventory-main",
    initialTablePreferences,
    filterableFields: INVENTORY_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  // --- Resolve currently-selected values from the engine's filter map ---
  const selectedWarehouseId = filters.warehouseId?.[0] ?? null
  const selectedCategoryId = filters.categoryId?.[0] ?? null
  const selectedProductId = filters.productId?.[0] ?? null
  const locationValue = filters.location?.[0] ?? ""
  const archivedRaw = filters.isArchived?.[0]
  const isArchivedValue =
    archivedRaw === "true" ? true : archivedRaw === "false" ? false : undefined

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
  // Category change → clear Product.

  const handleWarehouseChange = useCallback(
    (id: string | null) => {
      onFilterChange("warehouseId", id ? [id] : [])
      // Locations are warehouse-scoped; clear any picked location whenever
      // the warehouse changes (or is cleared) so the chip never carries a
      // value that's invalid for the new scope. Mirrors the Category → Product
      // cascade below.
      onFilterChange("location", [])
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

  const handleLocationChange = useCallback(
    (next: string | null) => {
      const trimmed = next?.trim() ?? ""
      onFilterChange("location", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const handleArchivedChange = useCallback(
    (next: boolean | undefined) => {
      onFilterChange(
        "isArchived",
        next === undefined ? [] : [next ? "true" : "false"],
      )
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (
      selectedWarehouseId ||
      selectedCategoryId ||
      selectedProductId ||
      locationValue
    ) {
      return true
    }
    if (isArchivedValue !== undefined) return true
    return false
  }, [
    searchQuery,
    selectedWarehouseId,
    selectedCategoryId,
    selectedProductId,
    locationValue,
    isArchivedValue,
  ])

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

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

        <ListToolbar>
          {/* Search + (Clear all | row count) */}
          <ListToolbarCell>
            <SearchControl
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
              placeholder="Search inventory item"
            />
            <ListToolbarBottomRow
              left={
                <ClearAllFiltersButton hasActive={hasActiveFilters} onClick={handleClearAll} />
              }
              right={<ListRowCount count={rows.length} total={total} label="rows" />}
            />
          </ListToolbarCell>

          {/* Warehouse → Location: location is warehouse-scoped (picker is
              disabled until a warehouse is picked; warehouse change cascades
              the location chip clear via handleWarehouseChange). */}
          <ListToolbarCell>
            <WarehouseFilterChip
              value={selectedWarehouseId}
              selectedLabel={warehouseLabel}
              onChange={handleWarehouseChange}
              initialOptions={initialWarehouseOptions}
            />
            <LocationPicker
              value={locationValue || null}
              onChange={handleLocationChange}
              warehouseId={selectedWarehouseId}
              placeholder="Location"
              disabledPlaceholder="Select warehouse first"
              ariaLabel="Filter inventory by location"
            />
          </ListToolbarCell>

          {/* Category → Product: product is category-scoped (category change
              cascades the product chip clear via handleCategoryChange). */}
          <ListToolbarCell>
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
          </ListToolbarCell>

          {/* Status: 2-row-tall card holding the archive segmented control. */}
          <ListToolbarCell>
            <ListToolbarTallCard label="Status">
              <ArchiveSegmentedControl
                value={isArchivedValue}
                onChange={handleArchivedChange}
              />
            </ListToolbarTallCard>
          </ListToolbarCell>

          {/* Import # → Purchase order: UI placeholders. The chip visuals
              match the closed-state of `AsyncRichDropdown`; queries get
              wired in a follow-up. */}
          <ListToolbarCell>
            <ImportNumberFilterChip />
            <PurchaseOrderFilterChip />
          </ListToolbarCell>
        </ListToolbar>

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
