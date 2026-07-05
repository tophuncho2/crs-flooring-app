"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react"
import { DebouncedSearchControl, ListActionBar, ListExportButton, ListPageShell, SortMenuBody, ToolbarMenuButton, useFetchListController, useListSelection, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import type { ListInput } from "@builders/application"
import {
  ADJUSTMENTS_EXPORT_COLUMNS,
  INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
  type CategoryOption,
  type InventoryAdjustmentListFilters,
  type EnrichedInventoryAdjustmentRow,
  type ProductOption,
  type WarehouseOption,
} from "@builders/domain"
import { usePickedOptionLabel } from "@/engines/picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import { useRouter } from "next/navigation"
import { useRecordEntryNavigation } from "@/hooks/navigation/use-record-entry-navigation"
import { buildInventoryAdjustmentHref, buildInventorySplitOffHref } from "@/hooks/navigation/routes"
import {
  ADJUSTMENTS_LIST_QUERY_KEY,
  buildAdjustmentsExportQuery,
  listAdjustmentsRequest,
} from "@/modules/adjustments/data/list-adjustments-request"
import {
  ADJUSTMENTS_ALLOWED_SORT_FIELDS,
  ADJUSTMENTS_MAX_SORT_LEVELS,
  ADJUSTMENTS_SORT_OPTIONS,
} from "./table/adjustments-list-columns"
import { AdjustmentsTable } from "./adjustments-table"

const ADJUSTMENTS_FILTERABLE_FIELDS = [
  "warehouseId",
  "categoryId",
  "productId",
  "adjNumber",
  "invNumber",
  "rollNumber",
  "dyeLot",
  "note",
] as const

/**
 * Engine-side filter shape: the list-view engine's filter map carries `string[]`
 * only. The identity search bars are free-text scalars, so we encode them as
 * 1-element arrays here and translate back to the typed
 * `InventoryAdjustmentListFilters` at the listFn boundary.
 */
type EngineAdjustmentFilters = {
  warehouseId?: ReadonlyArray<string>
  categoryId?: ReadonlyArray<string>
  productId?: ReadonlyArray<string>
  adjNumber?: ReadonlyArray<string>
  invNumber?: ReadonlyArray<string>
  rollNumber?: ReadonlyArray<string>
  dyeLot?: ReadonlyArray<string>
  note?: ReadonlyArray<string>
}

function toEngineFilters(app: InventoryAdjustmentListFilters): EngineAdjustmentFilters {
  const out: EngineAdjustmentFilters = {}
  if (app.warehouseId?.length) out.warehouseId = app.warehouseId
  if (app.categoryId?.length) out.categoryId = app.categoryId
  if (app.productId?.length) out.productId = app.productId
  if (app.adjNumber && app.adjNumber.length > 0) out.adjNumber = [app.adjNumber]
  if (app.invNumber && app.invNumber.length > 0) out.invNumber = [app.invNumber]
  if (app.rollNumber && app.rollNumber.length > 0) out.rollNumber = [app.rollNumber]
  if (app.dyeLot && app.dyeLot.length > 0) out.dyeLot = [app.dyeLot]
  if (app.note && app.note.length > 0) out.note = [app.note]
  return out
}

function toAppFilters(engine: EngineAdjustmentFilters): InventoryAdjustmentListFilters {
  const out: InventoryAdjustmentListFilters = {}
  if (engine.warehouseId?.length) out.warehouseId = engine.warehouseId
  if (engine.categoryId?.length) out.categoryId = engine.categoryId
  if (engine.productId?.length) out.productId = engine.productId
  const adjNumber = engine.adjNumber?.[0]?.trim()
  if (adjNumber) out.adjNumber = adjNumber
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

export default function AdjustmentsClient({
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
  initialFilters: InventoryAdjustmentListFilters
  initialWarehouseOptions: WarehouseOption[]
  initialSelectedWarehouse?: WarehouseOption | null
  initialCategoryOptions: CategoryOption[]
  initialSelectedCategory?: CategoryOption | null
  initialSelectedProduct?: ProductOption | null
}) {
  // Row click opens the adjustment inside its parent inventory's record view,
  // drilled into the adjustments section at that row (`?adjustment=<id>`). The
  // record view resolves the row by id when it isn't on its first loaded page.
  // `returnTo` brings the user back to this ledger.
  const router = useRouter()
  const { returnTo } = useRecordEntryNavigation("/dashboard/inventory")

  // The engine's filter map carries `string[]` only — translate to typed
  // InventoryAdjustmentListFilters at the listFn boundary.
  const adaptedListFn = useCallback(
    (input: ListInput<EngineAdjustmentFilters>) =>
      listAdjustmentsRequest({
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
    onSortsChange,
    onFilterChange,
    onClearAllFilters,
  } = useFetchListController<EnrichedInventoryAdjustmentRow, EngineAdjustmentFilters>({
    mode: "fetch",
    queryKey: [...ADJUSTMENTS_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialSort: { field: "createdAt", direction: "desc" },
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
    tableKey: "adjustments-main",
    filterableFields: ADJUSTMENTS_FILTERABLE_FIELDS,
    allowedSortFields: ADJUSTMENTS_ALLOWED_SORT_FIELDS,
    maxSortLevels: ADJUSTMENTS_MAX_SORT_LEVELS,
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
      buildAdjustmentsExportQuery({
        sorts,
        filters: toAppFilters(filters),
        page: 1,
        pageSize: INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
      }),
    [sorts, filters],
  )
  const exportColumns = useMemo(
    () => ADJUSTMENTS_EXPORT_COLUMNS.map((column) => ({ key: column.key, label: column.label })),
    [],
  )

  const selectedWarehouseId = filters.warehouseId?.[0] ?? null
  const selectedCategoryId = filters.categoryId?.[0] ?? null
  const selectedProductId = filters.productId?.[0] ?? null
  const adjNumberValue = filters.adjNumber?.[0] ?? ""
  const invNumberValue = filters.invNumber?.[0] ?? ""
  const rollNumberValue = filters.rollNumber?.[0] ?? ""
  const dyeLotValue = filters.dyeLot?.[0] ?? ""
  const noteValue = filters.note?.[0] ?? ""

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

  const handleWarehouseChange = useCallback(
    (id: string | null) => {
      onFilterChange("warehouseId", id ? [id] : [])
    },
    [onFilterChange],
  )

  // Category gates Product scope; changing category cascade-clears the product
  // selection. Mirrors the inventory list chips.
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

  // One handler for all four identity search bars — encodes the free-text value
  // as a 1-element array (or empty to clear).
  const handleTextFilterChange = useCallback(
    (key: "adjNumber" | "invNumber" | "rollNumber" | "dyeLot" | "note", next: string) => {
      const trimmed = next.trim()
      onFilterChange(key, trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  // Each tool lights its own dot independently; `hasActiveFilters` stays the
  // ListActionBar clear-all signal. Filter = the warehouse/category/product
  // pickers; Search = the adj#/inv#/roll#/dye-lot/note identity bars.
  const hasActiveFilterTool = useMemo(
    () =>
      Boolean(selectedWarehouseId) ||
      Boolean(selectedCategoryId) ||
      Boolean(selectedProductId),
    [selectedWarehouseId, selectedCategoryId, selectedProductId],
  )

  const hasActiveSearchTool = useMemo(
    () =>
      Boolean(adjNumberValue) ||
      Boolean(invNumberValue) ||
      Boolean(rollNumberValue) ||
      Boolean(dyeLotValue) ||
      Boolean(noteValue),
    [adjNumberValue, invNumberValue, rollNumberValue, dyeLotValue, noteValue],
  )

  const hasActiveFilters = useMemo(
    () => hasActiveFilterTool || hasActiveSearchTool,
    [hasActiveFilterTool, hasActiveSearchTool],
  )

  // The Sort tool lights its own dot independently of the filter/search dots
  // (createdAt-desc is the default, so any user-applied sort counts as active).
  const hasActiveSortTool = sorts.length > 0

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
  }, [onClearAllFilters])

  return (
    <ListPageShell>
      <ListActionBar
        label="Adjustments"
        rowCount={rows.length}
        total={total}
        rowCountLabel="adjustments"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        {/* Sort — the multi-column builder, leftmost. The only sort affordance
            (column headers are static labels). */}
        <ToolbarMenuButton
          label="Sort"
          title="Sort by"
          icon={ArrowUpDown}
          active={hasActiveSortTool}
          bodyClassName="w-auto"
        >
          <SortMenuBody
            options={ADJUSTMENTS_SORT_OPTIONS}
            value={sorts}
            maxLevels={ADJUSTMENTS_MAX_SORT_LEVELS}
            onChange={onSortsChange}
          />
        </ToolbarMenuButton>

        {/* Filter — the warehouse/category/product pickers composed directly
            (NOT a self-triggering FilterControl). Product is category-scoped:
            changing category cascade-clears it via handleCategoryChange. */}
        <ToolbarMenuButton
          label="Filter"
          icon={SlidersHorizontal}
          active={hasActiveFilterTool}
        >
          <WarehousePicker
            value={selectedWarehouseId}
            selectedLabel={warehouseFilter.selectedLabel}
            onChange={handleWarehouseChange}
            onOptionSelected={warehouseFilter.onOptionSelected}
            initialOptions={initialWarehouseOptions}
            placeholder="Warehouse"
            searchPlaceholder="Search warehouses"
            emptyMessage="No warehouses match"
            clearLabel="Clear filter"
            ariaLabel="Filter adjustments by warehouse"
          />
          <CategoryPicker
            value={selectedCategoryId}
            selectedLabel={categoryFilter.selectedLabel}
            onChange={handleCategoryChange}
            onOptionSelected={categoryFilter.onOptionSelected}
            initialOptions={initialCategoryOptions}
            placeholder="Category"
            searchPlaceholder="Search categories"
            emptyMessage="No categories match"
            clearLabel="Clear filter"
            ariaLabel="Filter adjustments by category"
          />
          <ProductPicker
            value={selectedProductId}
            selectedLabel={productFilter.selectedLabel}
            onChange={handleProductChange}
            onOptionSelected={productFilter.onOptionSelected}
            categoryId={selectedCategoryId}
            placeholder="Product"
            searchPlaceholder="Search products"
            emptyMessage="No products match"
            clearLabel="Clear filter"
            ariaLabel="Filter adjustments by product"
          />
        </ToolbarMenuButton>

        {/* Search — the five identity bars. Adj # is the exact record-number
            match; the rest ILIKE their own column. */}
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={hasActiveSearchTool}
        >
          <DebouncedSearchControl
            value={adjNumberValue}
            onCommit={(next) => handleTextFilterChange("adjNumber", next)}
            placeholder="Adj #"
            ariaLabel="Search adjustments by adjustment number"
          />
          <DebouncedSearchControl
            value={rollNumberValue}
            onCommit={(next) => handleTextFilterChange("rollNumber", next)}
            placeholder="Roll #"
            ariaLabel="Search adjustments by roll number"
          />
          <DebouncedSearchControl
            value={invNumberValue}
            onCommit={(next) => handleTextFilterChange("invNumber", next)}
            placeholder="Inv #"
            ariaLabel="Search adjustments by inventory number"
          />
          <DebouncedSearchControl
            value={dyeLotValue}
            onCommit={(next) => handleTextFilterChange("dyeLot", next)}
            placeholder="Dye lot"
            ariaLabel="Search adjustments by dye lot"
          />
          <DebouncedSearchControl
            value={noteValue}
            onCommit={(next) => handleTextFilterChange("note", next)}
            placeholder="Note"
            ariaLabel="Search adjustments by note"
          />
        </ToolbarMenuButton>

        {/* Export — column-picker + row-cap; exports the ticked rows, or the
            whole filtered set when nothing is ticked. */}
        <ListExportButton
          endpoint="/api/adjustments/export"
          query={exportQuery}
          columns={exportColumns}
          filename="adjustments-export.csv"
          selectionEnabled={selectionEnabled}
          onToggleSelectionEnabled={toggleSelectionEnabled}
          selectedIds={selectedIds}
          eligibleCount={pageEligibleIds.length}
          onToggleAll={() => selection.toggleAll(pageEligibleIds)}
        />
      </ListActionBar>

      <AdjustmentsTable
        rows={rows}
        selection={selectionEnabled ? selection : undefined}
        onOpenAdjustment={(row) =>
          router.push(buildInventoryAdjustmentHref(row.inventoryId, row.id, returnTo))
        }
        onSplitOff={(row) =>
          router.push(
            buildInventorySplitOffHref({
              sourceInventoryId: row.inventoryId,
              quantity: row.quantity,
              returnTo,
            }),
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
      />
    </ListPageShell>
  )
}
