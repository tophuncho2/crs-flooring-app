"use client"

import { useCallback, useEffect, useMemo } from "react"
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react"
import { SortMenuBody, useFetchListController, useListSelection, ListExportButton, LIST_FRESHNESS_STANDARD, DebouncedSearchControl, FilterGroupLabel, ListActionBar, ListPageShell, ListPageFeedback, ToolbarMenuButton, ListCreateButtonPortal } from "@/engines/list-view"
import { FilterPickerChip, usePickedOptionLabel } from "@/engines/picker"
import { reconnectGoogleForSheets } from "@/modules/auth/reconnect-google"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import { ProductSearchControls } from "@/modules/products/components/list/product-search-controls"
import type { InventoryListFilters, ListInput } from "@builders/application"
import {
  INVENTORY_EXPORT_COLUMNS,
  LIST_INVENTORY_PAGE_SIZE,
  PRODUCT_SEARCH_KEYS,
  type CategoryOption,
  type InventoryRow,
  type ProductOption,
  type ProductSearchKey,
  type WarehouseOption,
} from "@builders/domain"
import {
  buildInventoryExportQuery,
  INVENTORY_LIST_QUERY_KEY,
  listInventoryRequest,
} from "@/modules/inventory/data/list-inventory-request"
import { useRouter } from "next/navigation"
import { useInventoryListController } from "@/modules/inventory/controllers/list/use-inventory-list-controller"
import { NEW_ADJUSTMENT_ID } from "@/modules/inventory/controllers/record/use-inventory-record-selection"
import { useRecordEntryNavigation } from "@/hooks/navigation/use-record-entry-navigation"
import { buildInventoryRecordHref } from "@/hooks/navigation"
import { InventoryTable } from "./inventory-table"
import {
  INVENTORY_ALLOWED_SORT_FIELDS,
  INVENTORY_MAX_SORT_LEVELS,
  INVENTORY_SORT_OPTIONS,
} from "./table/inventory-list-columns"
import { LocationPicker } from "@/modules/inventory/components/picker/location-picker"
import { PurchaseOrderPicker } from "@/modules/inventory/components/picker/purchase-order-picker"
import { ImportNumberPicker } from "@/modules/inventory/components/picker/import-number-picker"
import { ArchiveSegmentedControl } from "./toolbar-controls/archive-segmented-control"

const INVENTORY_FILTERABLE_FIELDS = [
  "warehouseId",
  "categoryId",
  "productId",
  "importNumber",
  "purchaseOrderNumber",
  "location",
  "isArchived",
  "invNumber",
  "rollNumber",
  "dyeLot",
  "note",
  ...PRODUCT_SEARCH_KEYS,
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
  invNumber?: ReadonlyArray<string>
  rollNumber?: ReadonlyArray<string>
  dyeLot?: ReadonlyArray<string>
  note?: ReadonlyArray<string>
} & Partial<Record<ProductSearchKey, ReadonlyArray<string>>>

function toEngineFilters(app: InventoryListFilters): EngineInventoryFilters {
  const out: EngineInventoryFilters = {}
  if (app.warehouseId?.length) out.warehouseId = app.warehouseId
  if (app.categoryId?.length) out.categoryId = app.categoryId
  if (app.productId?.length) out.productId = app.productId
  if (app.importNumber?.length) out.importNumber = app.importNumber
  if (app.purchaseOrderNumber?.length) out.purchaseOrderNumber = app.purchaseOrderNumber
  if (app.location && app.location.length > 0) out.location = [app.location]
  if (app.isArchived !== undefined) out.isArchived = [app.isArchived ? "true" : "false"]
  if (app.invNumber && app.invNumber.length > 0) out.invNumber = [app.invNumber]
  if (app.rollNumber && app.rollNumber.length > 0) out.rollNumber = [app.rollNumber]
  if (app.dyeLot && app.dyeLot.length > 0) out.dyeLot = [app.dyeLot]
  if (app.note && app.note.length > 0) out.note = [app.note]
  for (const key of PRODUCT_SEARCH_KEYS) {
    const value = app[key]?.trim()
    if (value) out[key] = [value]
  }
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
  const invNumber = engine.invNumber?.[0]?.trim()
  if (invNumber) out.invNumber = invNumber
  const rollNumber = engine.rollNumber?.[0]?.trim()
  if (rollNumber) out.rollNumber = rollNumber
  const dyeLot = engine.dyeLot?.[0]?.trim()
  if (dyeLot) out.dyeLot = dyeLot
  const note = engine.note?.[0]?.trim()
  if (note) out.note = note
  for (const key of PRODUCT_SEARCH_KEYS) {
    const value = engine[key]?.[0]?.trim()
    if (value) out[key] = value
  }
  return out
}

export default function InventoryClient({
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
  initialFilters: InventoryListFilters
  initialWarehouseOptions: WarehouseOption[]
  initialSelectedWarehouse?: WarehouseOption | null
  initialCategoryOptions: CategoryOption[]
  initialSelectedCategory?: CategoryOption | null
  initialSelectedProduct?: ProductOption | null
}) {
  const { message, pageError } = useInventoryListController()

  // Row clicks open the inventory record view (full-page) with the item
  // pre-selected in the header pickers. `returnTo` brings the user back to this
  // list with its filters intact.
  const router = useRouter()
  const { returnTo, openCreate } = useRecordEntryNavigation("/dashboard/inventory")

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
    totals,
    filters,
    sort,
    sorts,
    hasNonDefaultSort,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSortsChange,
    onFilterChange,
    onClearAllFilters,
    columnWidths,
    onColumnWidthsChange,
  } = useFetchListController<InventoryRow, EngineInventoryFilters>({
    mode: "fetch",
    queryKey: [...INVENTORY_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_INVENTORY_PAGE_SIZE,
    tableKey: "inventory-main",
    filterableFields: INVENTORY_FILTERABLE_FIELDS,
    allowedSortFields: INVENTORY_ALLOWED_SORT_FIELDS,
    maxSortLevels: INVENTORY_MAX_SORT_LEVELS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  // Row selection (CSV export scope). Checkboxes are always visible on the table
  // (opt-in by wiring selection here) — no export-menu gate. Cleared whenever the
  // filtered/sorted scope changes so a ticked id from a prior scope can't leak
  // into an export.
  const selection = useListSelection()

  const scopeSignature = useMemo(() => JSON.stringify({ filters, sorts }), [filters, sorts])
  useEffect(() => {
    selection.clear()
    // Clear only when the filtered/sorted scope changes — NOT on every selection
    // mutation (depending on `selection` would wipe ticks the instant they're made).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeSignature])

  const selectedIds = useMemo(() => [...selection.selectedIds], [selection.selectedIds])
  const exportQuery = useMemo(
    () =>
      buildInventoryExportQuery({
        sort: sort ?? undefined,
        sorts,
        filters: toAppFilters(filters),
        page: 1,
        pageSize: LIST_INVENTORY_PAGE_SIZE,
      }),
    [sort, sorts, filters],
  )
  const exportColumns = useMemo(
    () => INVENTORY_EXPORT_COLUMNS.map((column) => ({ key: column.key, label: column.label })),
    [],
  )

  // --- Resolve currently-selected values from the engine's filter map ---
  const selectedWarehouseId = filters.warehouseId?.[0] ?? null
  const selectedCategoryId = filters.categoryId?.[0] ?? null
  const selectedProductId = filters.productId?.[0] ?? null
  const selectedPurchaseOrderNumber = filters.purchaseOrderNumber?.[0] ?? null
  const selectedImportNumber = filters.importNumber?.[0] ?? null
  const locationValue = filters.location?.[0] ?? ""
  const archivedRaw = filters.isArchived?.[0]
  // Defaults to Active (`false`) — there is no "All" state; absent means active.
  const isArchivedValue = archivedRaw === "true"

  // --- Per-field identity search bars ---
  const invNumberValue = filters.invNumber?.[0] ?? ""
  const rollNumberValue = filters.rollNumber?.[0] ?? ""
  const dyeLotValue = filters.dyeLot?.[0] ?? ""
  const noteValue = filters.note?.[0] ?? ""

  // --- Shared product-attribute search bars (resolve through the product join) ---
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

  // --- Selected-label snapshots ---
  // Each chip needs a label so its trigger renders the picked name on first
  // paint without a refetch. The page loader resolves the initial label (when a
  // filter is preset in the URL); these useMemos seed the trigger from the SSR
  // options, and `usePickedOptionLabel` below overlays the picked option so a
  // value picked via async search (outside the seed) still renders a label.

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

  // --- Cascade-clear filter handlers ---
  // Category change → clear Product.

  const handleWarehouseChange = useCallback(
    (id: string | null) => {
      onFilterChange("warehouseId", id ? [id] : [])
      // Location is warehouse-scoped (the LocationPicker is gated on a picked
      // warehouse). Cascade-clear whenever the warehouse changes (or is
      // cleared) so the chip never carries a value that's invalid for the new
      // scope. Mirrors the Category → Product cascade below.
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

  // Import PO# and Import # are mutually exclusive — only one import-identity
  // filter is active at a time. Selecting one clears the other (no-op clear
  // when deselecting, so clearing one doesn't disturb the other).
  const handlePurchaseOrderChange = useCallback(
    (next: string | null) => {
      onFilterChange("purchaseOrderNumber", next ? [next] : [])
      if (next) onFilterChange("importNumber", [])
    },
    [onFilterChange],
  )

  const handleImportNumberChange = useCallback(
    (next: string | null) => {
      onFilterChange("importNumber", next ? [next] : [])
      if (next) onFilterChange("purchaseOrderNumber", [])
    },
    [onFilterChange],
  )

  const handleArchivedChange = useCallback(
    (next: boolean) => {
      onFilterChange("isArchived", [next ? "true" : "false"])
    },
    [onFilterChange],
  )

  // One handler for all four identity search bars — encodes the free-text value
  // as a 1-element array (or empty to clear) like the location filter.
  const handleTextFilterChange = useCallback(
    (key: "invNumber" | "rollNumber" | "dyeLot" | "note", next: string) => {
      const trimmed = next.trim()
      onFilterChange(key, trimmed.length > 0 ? [trimmed] : [])
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

  const hasActiveSortTool = hasNonDefaultSort

  // Each tool lights its own dot independently; `hasActiveFilters` stays the
  // ListActionBar clear-all signal. Filter = the warehouse/location/category/
  // product/PO#/IMP#/status attribute pickers; Search = the inv#/roll#/dye-lot/
  // note identity bars. Sorting is driven solely by the Sort menu (no header
  // affordance).
  const hasActiveFilterTool = useMemo(
    () =>
      Boolean(selectedWarehouseId) ||
      Boolean(selectedCategoryId) ||
      Boolean(selectedProductId) ||
      Boolean(selectedPurchaseOrderNumber) ||
      Boolean(selectedImportNumber) ||
      Boolean(locationValue) ||
      isArchivedValue,
    [
      selectedWarehouseId,
      selectedCategoryId,
      selectedProductId,
      selectedPurchaseOrderNumber,
      selectedImportNumber,
      locationValue,
      isArchivedValue,
    ],
  )

  const hasActiveSearchTool = useMemo(
    () =>
      Boolean(invNumberValue) ||
      Boolean(rollNumberValue) ||
      Boolean(dyeLotValue) ||
      Boolean(noteValue) ||
      hasActiveProductSearch,
    [invNumberValue, rollNumberValue, dyeLotValue, noteValue, hasActiveProductSearch],
  )

  const hasActiveFilters = useMemo(
    () => hasActiveFilterTool || hasActiveSearchTool || hasActiveSortTool,
    [hasActiveFilterTool, hasActiveSearchTool, hasActiveSortTool],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
  }, [onClearAllFilters])

  return (
    <ListPageShell fill>
      <ListCreateButtonPortal label="Inventory" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Inventory"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        {/* Sort — the multi-column builder, leftmost. The only sort affordance. */}
        <ToolbarMenuButton
          label="Sort"
          title="Sort by"
          icon={ArrowUpDown}
          active={hasActiveSortTool}
          bodyClassName="w-auto"
        >
          <SortMenuBody
            options={INVENTORY_SORT_OPTIONS}
            value={sorts}
            maxLevels={INVENTORY_MAX_SORT_LEVELS}
            onChange={onSortsChange}
          />
        </ToolbarMenuButton>

        {/* Filter — the attribute pickers composed directly (NOT a
            self-triggering FilterControl). Cascades preserved: Warehouse
            gates/clears Location; Category clears Product; PO# and IMP# are
            mutually exclusive. Status defaults to Active. */}
        <ToolbarMenuButton
          label="Filter"
          icon={SlidersHorizontal}
          active={hasActiveFilterTool}
        >
          <FilterPickerChip<WarehouseOption>
            value={selectedWarehouseId}
            onChange={handleWarehouseChange}
            selectedLabel={warehouseFilter.selectedLabel}
            onOptionSelected={warehouseFilter.onOptionSelected}
            nounSingular="Warehouse"
            nounPlural="warehouses"
            subject="inventory"
          >
            {(chrome) => (
              <WarehousePicker {...chrome} initialOptions={initialWarehouseOptions} />
            )}
          </FilterPickerChip>
          <LocationPicker
            value={locationValue || null}
            onChange={handleLocationChange}
            warehouseId={selectedWarehouseId}
            placeholder="Location"
            disabledPlaceholder="Select warehouse first"
            ariaLabel="Filter inventory by location"
          />
          <FilterPickerChip<CategoryOption>
            value={selectedCategoryId}
            onChange={handleCategoryChange}
            selectedLabel={categoryFilter.selectedLabel}
            onOptionSelected={categoryFilter.onOptionSelected}
            nounSingular="Category"
            nounPlural="categories"
            subject="inventory"
          >
            {(chrome) => (
              <CategoryPicker {...chrome} initialOptions={initialCategoryOptions} />
            )}
          </FilterPickerChip>
          <FilterPickerChip<ProductOption>
            value={selectedProductId}
            onChange={handleProductChange}
            selectedLabel={productFilter.selectedLabel}
            onOptionSelected={productFilter.onOptionSelected}
            nounSingular="Product"
            nounPlural="products"
            subject="inventory"
          >
            {(chrome) => <ProductPicker {...chrome} categoryId={selectedCategoryId} />}
          </FilterPickerChip>
          <PurchaseOrderPicker
            value={selectedPurchaseOrderNumber}
            onChange={handlePurchaseOrderChange}
            placeholder="PO#"
            ariaLabel="Filter inventory by import PO number"
          />
          <ImportNumberPicker
            value={selectedImportNumber}
            onChange={handleImportNumberChange}
            placeholder="IMP#"
            ariaLabel="Filter inventory by import number"
          />
          <ArchiveSegmentedControl
            value={isArchivedValue}
            onChange={handleArchivedChange}
          />
        </ToolbarMenuButton>

        {/* Search — two grouped columns (Identity | Product) in a 2-column grid,
            mirroring the WO Filter menu. Identity bars match the row's own
            columns; Product bars resolve through the product join and share their
            source with the Products list. Filling more than one narrows (AND). */}
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
                value={invNumberValue}
                onCommit={(next) => handleTextFilterChange("invNumber", next)}
                placeholder="Inv #"
                ariaLabel="Search inventory by inventory number"
              />
              <DebouncedSearchControl
                value={rollNumberValue}
                onCommit={(next) => handleTextFilterChange("rollNumber", next)}
                placeholder="Roll #"
                ariaLabel="Search inventory by roll number"
              />
              <DebouncedSearchControl
                value={dyeLotValue}
                onCommit={(next) => handleTextFilterChange("dyeLot", next)}
                placeholder="Dye lot"
                ariaLabel="Search inventory by dye lot"
              />
              <DebouncedSearchControl
                value={noteValue}
                onCommit={(next) => handleTextFilterChange("note", next)}
                placeholder="Note"
                ariaLabel="Search inventory by note"
              />
            </div>
            <div className="flex flex-col gap-2">
              <FilterGroupLabel>Product</FilterGroupLabel>
              <ProductSearchControls
                values={productSearchValues}
                onChange={handleProductSearchChange}
                subject="inventory"
              />
            </div>
          </div>
        </ToolbarMenuButton>

        {/* Export — column-picker + row-cap; exports the ticked rows, or the
            whole filtered set when nothing is ticked. */}
        <ListExportButton
          endpoint="/api/inventory/export"
          query={exportQuery}
          columns={exportColumns}
          filename="inventory-export.csv"
          selectedIds={selectedIds}
          onReauthRequired={reconnectGoogleForSheets}
        />
      </ListActionBar>

      <InventoryTable
        rows={rows}
        selection={selection}
        onOpenInventory={(id) =>
          router.push(buildInventoryRecordHref({ inventoryId: id, returnTo }))
        }
        onDuplicateInventory={(id) => openCreate({ sourceId: id })}
        // Add Adjustment: open the record straight into the adjustment-create form.
        onAddAdjustment={(id) =>
          router.push(
            buildInventoryRecordHref({ inventoryId: id, adjustment: NEW_ADJUSTMENT_ID, returnTo }),
          )
        }
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
        // Stock-balance total over the full filtered set (server aggregate).
        rollups={totals ? [{ label: "Total Stock", value: totals.stockBalance }] : undefined}
      />
    </ListPageShell>
  )
}
