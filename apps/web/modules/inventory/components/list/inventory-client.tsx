"use client"

import { useCallback, useMemo } from "react"
import { PaginateControls } from "@/components/features/paginate"
import {
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
  type InventoryImportNumberOption,
  type InventoryPurchaseOrderOption,
  type InventoryRow,
  type ProductOption,
  type TablePreferencePayload,
  type WarehouseOption,
} from "@builders/domain"
import {
  INVENTORY_LIST_QUERY_KEY,
  listInventoryRequest,
} from "@/modules/inventory/data/list-inventory-request"
import { useInventoryListController } from "@/modules/inventory/controllers/list/use-inventory-list-controller"
import { InventoryTable } from "./inventory-table"
import { LocationPicker } from "@/modules/inventory/components/picker/location-picker"
import { ArchiveSegmentedControl } from "./toolbar-controls/archive-segmented-control"
import { CategoryFilterChip } from "./toolbar-controls/category-filter-chip"
import { ImportNumberFilterChip } from "./toolbar-controls/import-number-filter-chip"
import { InventoryListSearch } from "./toolbar-controls/inventory-list-search"
import { ProductFilterChip } from "./toolbar-controls/product-filter-chip"
import { PurchaseOrderFilterChip } from "./toolbar-controls/purchase-order-filter-chip"
import { InventoryClearAll } from "./toolbar-controls/sub-controls/inventory-clear-all"
import { InventoryRowCount } from "./toolbar-controls/sub-controls/inventory-row-count"
import { WarehouseFilterChip } from "./toolbar-controls/warehouse-filter-chip"

const INVENTORY_FILTERABLE_FIELDS = [
  "warehouseId",
  "categoryId",
  "productId",
  "importNumber",
  "purchaseOrderNumber",
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
  importNumber?: ReadonlyArray<string>
  purchaseOrderNumber?: ReadonlyArray<string>
  location?: ReadonlyArray<string>
  isArchived?: ReadonlyArray<string>
}

function toEngineFilters(app: InventoryListFilters): EngineInventoryFilters {
  const out: EngineInventoryFilters = {}
  if (app.warehouseId?.length) out.warehouseId = app.warehouseId
  if (app.categoryId?.length) out.categoryId = app.categoryId
  if (app.productId?.length) out.productId = app.productId
  if (app.importNumber?.length) out.importNumber = app.importNumber
  if (app.purchaseOrderNumber?.length) out.purchaseOrderNumber = app.purchaseOrderNumber
  if (app.location && app.location.length > 0) out.location = [app.location]
  if (app.isArchived !== undefined) out.isArchived = [app.isArchived ? "true" : "false"]
  return out
}

function toAppFilters(engine: EngineInventoryFilters): InventoryListFilters {
  const out: InventoryListFilters = {}
  if (engine.warehouseId?.length) out.warehouseId = engine.warehouseId
  if (engine.categoryId?.length) out.categoryId = engine.categoryId
  if (engine.productId?.length) out.productId = engine.productId
  if (engine.importNumber?.length) out.importNumber = engine.importNumber
  if (engine.purchaseOrderNumber?.length) out.purchaseOrderNumber = engine.purchaseOrderNumber
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
  initialImportNumberOptions = [],
  initialPurchaseOrderOptions = [],
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
  /** SSR-loaded seed for the Import # picker (distinct values on inventory). */
  initialImportNumberOptions?: InventoryImportNumberOption[]
  /** SSR-loaded seed for the PO # picker (distinct values on inventory). */
  initialPurchaseOrderOptions?: InventoryPurchaseOrderOption[]
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
  const selectedImportNumber = filters.importNumber?.[0] ?? null
  const selectedPurchaseOrderNumber = filters.purchaseOrderNumber?.[0] ?? null
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

  // Import # / PO # chip labels are derived directly from the selected value by
  // each picker (`#IMP-${value}` / `PO# ${value}`); no SSR pre-resolve needed.

  // --- Cascade-clear filter handlers ---
  // Category change → clear Product.

  const handleWarehouseChange = useCallback(
    (id: string | null) => {
      onFilterChange("warehouseId", id ? [id] : [])
      // Locations + import #/PO # are all warehouse-scoped (pickers are
      // gated on a picked warehouse). Cascade-clear whenever the warehouse
      // changes (or is cleared) so no chip carries a value that's invalid
      // for the new scope. Mirrors the Category → Product cascade below.
      onFilterChange("location", [])
      onFilterChange("importNumber", [])
      onFilterChange("purchaseOrderNumber", [])
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

  const handleImportNumberChange = useCallback(
    (next: string | null) => {
      onFilterChange("importNumber", next ? [next] : [])
    },
    [onFilterChange],
  )

  const handlePurchaseOrderNumberChange = useCallback(
    (next: string | null) => {
      onFilterChange("purchaseOrderNumber", next ? [next] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (
      selectedWarehouseId ||
      selectedCategoryId ||
      selectedProductId ||
      selectedImportNumber ||
      selectedPurchaseOrderNumber ||
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
    selectedImportNumber,
    selectedPurchaseOrderNumber,
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
              Inventory
            </span>
          </div>
          {/* pt-0 overrides ListToolbar's pt-4 so the tab's bottom edge meets
              the encased card's top edge (rounded-tl-none seam). */}
          <ListToolbar className="pt-0">
            {/* Search + (Clear all | row count) — encased card attached to the tab above */}
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <InventoryListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <ListToolbarBottomRow
                  left={<InventoryClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<InventoryRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            {/* Warehouse-scoped chips: Warehouse + Location + Import # + PO #
                all live inside one encased card mirroring the search-bar
                encasing minus the tab/label. The warehouse pick gates the
                other three (each picker renders disabled until a warehouse is
                picked); a warehouse change cascades a clear into Location,
                Import #, and PO # via handleWarehouseChange. */}
            <ListToolbarCell colSpan={2}>
              <div className="grid grid-cols-2 gap-2 rounded-md border border-[var(--panel-border)] p-2">
                <WarehouseFilterChip
                  value={selectedWarehouseId}
                  selectedLabel={warehouseLabel}
                  onChange={handleWarehouseChange}
                  initialOptions={initialWarehouseOptions}
                />
                <ImportNumberFilterChip
                  value={selectedImportNumber}
                  onChange={handleImportNumberChange}
                  warehouseId={selectedWarehouseId}
                  {...(isArchivedValue !== undefined
                    ? { isArchived: isArchivedValue }
                    : {})}
                  initialOptions={initialImportNumberOptions}
                />
                <LocationPicker
                  value={locationValue || null}
                  onChange={handleLocationChange}
                  warehouseId={selectedWarehouseId}
                  placeholder="Location"
                  disabledPlaceholder="Select warehouse first"
                  ariaLabel="Filter inventory by location"
                />
                <PurchaseOrderFilterChip
                  value={selectedPurchaseOrderNumber}
                  onChange={handlePurchaseOrderNumberChange}
                  warehouseId={selectedWarehouseId}
                  {...(isArchivedValue !== undefined
                    ? { isArchived: isArchivedValue }
                    : {})}
                  initialOptions={initialPurchaseOrderOptions}
                />
              </div>
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
          </ListToolbar>
        </div>

        <InventoryTable
          rows={rows}
          onOpenInventory={openInventory}
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
