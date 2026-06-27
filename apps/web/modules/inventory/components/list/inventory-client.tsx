"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react"
import { SortMenuBody, useFetchListController, useListSelection, ListExportButton, LIST_FRESHNESS_STANDARD, DebouncedSearchControl, ListActionBar, ListPageShell, ListPageFeedback, ToolbarMenuButton, ListCreateButtonPortal } from "@/engines/list-view"
import type { InventoryListFilters, ListInput } from "@builders/application"
import {
  INVENTORY_EXPORT_COLUMNS,
  LIST_INVENTORY_PAGE_SIZE,
  type CategoryOption,
  type InventoryRow,
  type ProductOption,
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
import { CategoryFilterChip } from "./toolbar-controls/category-filter-chip"
import { ProductFilterChip } from "./toolbar-controls/product-filter-chip"
import { WarehouseFilterChip } from "./toolbar-controls/warehouse-filter-chip"

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
] as const

/**
 * Default direction when first selecting a column: text columns (product,
 * location, warehouse) read naturally A→Z; date + quantity columns default to
 * newest/highest first.
 */
function defaultSortDirection(field: string): "asc" | "desc" {
  return field === "productName" || field === "location" || field === "warehouse"
    ? "asc"
    : "desc"
}

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
  if (app.invNumber && app.invNumber.length > 0) out.invNumber = [app.invNumber]
  if (app.rollNumber && app.rollNumber.length > 0) out.rollNumber = [app.rollNumber]
  if (app.dyeLot && app.dyeLot.length > 0) out.dyeLot = [app.dyeLot]
  if (app.note && app.note.length > 0) out.note = [app.note]
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
    filters,
    sort,
    sorts,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSortChange,
    onToggleSortDirection,
    onSortsChange,
    onFilterChange,
    onClearAllFilters,
  } = useFetchListController<InventoryRow, EngineInventoryFilters>({
    mode: "fetch",
    queryKey: [...INVENTORY_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialSort: { field: "createdAt", direction: "desc" },
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_INVENTORY_PAGE_SIZE,
    tableKey: "inventory-main",
    filterableFields: INVENTORY_FILTERABLE_FIELDS,
    allowedSortFields: INVENTORY_ALLOWED_SORT_FIELDS,
    maxSortLevels: INVENTORY_MAX_SORT_LEVELS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  // Row selection (CSV export scope). Drop it whenever the filtered/sorted scope
  // changes so a ticked id from a prior scope can't leak into an export.
  const selection = useListSelection()
  // Selection mode is off by default — the checkbox column only appears once the
  // user flips "Select specific rows" in the Export menu. Turning it off clears
  // any ticks so a hidden selection can't silently scope a later export.
  const [selectionEnabled, setSelectionEnabled] = useState(false)
  const toggleSelectionEnabled = useCallback(() => {
    setSelectionEnabled((prev) => {
      if (prev) selection.clear()
      return !prev
    })
  }, [selection])

  const scopeSignature = useMemo(() => JSON.stringify({ filters, sorts }), [filters, sorts])
  useEffect(() => {
    selection.clear()
    // Clear only when the filtered/sorted scope changes — NOT on every selection
    // mutation (depending on `selection` would wipe ticks the instant they're made).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeSignature])

  const selectedIds = useMemo(() => [...selection.selectedIds], [selection.selectedIds])
  const pageEligibleIds = useMemo(() => rows.map((row) => row.id), [rows])
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

  // Column-header sort: flip direction when the active column is re-clicked,
  // else switch field with a sensible default direction.
  const handleSort = useCallback(
    (key: string) => {
      if (sort?.field === key) onToggleSortDirection()
      else onSortChange({ field: key, direction: defaultSortDirection(key) })
    },
    [sort, onSortChange, onToggleSortDirection],
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

  const hasActiveSortTool = sorts.length > 0

  // Each tool lights its own dot independently; `hasActiveFilters` stays the
  // ListActionBar clear-all signal. Filter = the warehouse/location/category/
  // product/PO#/IMP#/status attribute pickers; Search = the inv#/roll#/dye-lot/
  // note identity bars. Single-column sort stays a header-caret click (column
  // keys match the backend sort fields, so `sorts` flows onto the carets).
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
      Boolean(noteValue),
    [invNumberValue, rollNumberValue, dyeLotValue, noteValue],
  )

  const hasActiveFilters = useMemo(
    () => hasActiveFilterTool || hasActiveSearchTool,
    [hasActiveFilterTool, hasActiveSearchTool],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
  }, [onClearAllFilters])

  return (
    <ListPageShell>
      <ListCreateButtonPortal label="Inventory" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Inventory"
        rowCount={rows.length}
        total={total}
        rowCountLabel="inventory"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        {/* Sort — the multi-column builder, leftmost. Single-column sort stays a
            header-caret click on the table. */}
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

        {/* Search — the per-field identity bars. Inv # is an exact record-number
            match; roll #/dye lot/note each ILIKE their own column. Filling more
            than one narrows (AND). */}
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={hasActiveSearchTool}
        >
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
        </ToolbarMenuButton>

        {/* Export — column-picker + row-cap; exports the ticked rows, or the
            whole filtered set when nothing is ticked. */}
        <ListExportButton
          endpoint="/api/inventory/export"
          query={exportQuery}
          columns={exportColumns}
          filename="inventory-export.csv"
          selectionEnabled={selectionEnabled}
          onToggleSelectionEnabled={toggleSelectionEnabled}
          selectedIds={selectedIds}
          eligibleCount={pageEligibleIds.length}
          onToggleAll={() => selection.toggleAll(pageEligibleIds)}
        />
      </ListActionBar>

      <InventoryTable
        rows={rows}
        selection={selectionEnabled ? selection : undefined}
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
        sort={sort}
        sorts={sorts}
        onSort={handleSort}
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
