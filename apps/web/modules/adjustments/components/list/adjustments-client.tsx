"use client"

import { useCallback, useEffect, useMemo } from "react"
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react"
import { DebouncedSearchControl, FilterGroupLabel, ListActionBar, ListExportButton, ListPageShell, SortMenuBody, ToolbarMenuButton, useFetchListController, useListSelection, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import type { ListInput } from "@builders/application"
import {
  ADJUSTMENTS_EXPORT_COLUMNS,
  INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
  PRODUCT_SEARCH_KEYS,
  type CategoryOption,
  type InventoryAdjustmentListFilters,
  type EnrichedInventoryAdjustmentRow,
  type ProductOption,
  type ProductSearchKey,
  type WarehouseOption,
} from "@builders/domain"
import { FilterPickerChip, usePickedOptionLabel } from "@/engines/picker"
import { reconnectGoogleForSheets } from "@/modules/auth/reconnect-google"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import { ProductSearchControls } from "@/modules/products/components/list/product-search-controls"
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
  ...PRODUCT_SEARCH_KEYS,
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
} & Partial<Record<ProductSearchKey, ReadonlyArray<string>>>

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
  for (const key of PRODUCT_SEARCH_KEYS) {
    const value = app[key]?.trim()
    if (value) out[key] = [value]
  }
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
  for (const key of PRODUCT_SEARCH_KEYS) {
    const value = engine[key]?.[0]?.trim()
    if (value) out[key] = value
  }
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
    totals,
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
  } = useFetchListController<EnrichedInventoryAdjustmentRow, EngineAdjustmentFilters>({
    mode: "fetch",
    queryKey: [...ADJUSTMENTS_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
    tableKey: "adjustments-main",
    filterableFields: ADJUSTMENTS_FILTERABLE_FIELDS,
    allowedSortFields: ADJUSTMENTS_ALLOWED_SORT_FIELDS,
    maxSortLevels: ADJUSTMENTS_MAX_SORT_LEVELS,
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

  // Shared product-attribute search bars — same 1-element-array encoding.
  const handleProductSearchChange = useCallback(
    (key: ProductSearchKey, next: string) => {
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
      Boolean(noteValue) ||
      hasActiveProductSearch,
    [adjNumberValue, invNumberValue, rollNumberValue, dyeLotValue, noteValue, hasActiveProductSearch],
  )

  // An active user sort folds into the single "Clear all" signal; the Sort menu
  // no longer carries its own Clear.
  const hasActiveSortTool = hasNonDefaultSort

  const hasActiveFilters = useMemo(
    () => hasActiveFilterTool || hasActiveSearchTool || hasActiveSortTool,
    [hasActiveFilterTool, hasActiveSearchTool, hasActiveSortTool],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
  }, [onClearAllFilters])

  return (
    <ListPageShell fill>
      <ListActionBar
        label="Adjustments"
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
          <FilterPickerChip<WarehouseOption>
            value={selectedWarehouseId}
            onChange={handleWarehouseChange}
            selectedLabel={warehouseFilter.selectedLabel}
            onOptionSelected={warehouseFilter.onOptionSelected}
            nounSingular="Warehouse"
            nounPlural="warehouses"
            subject="adjustments"
          >
            {(chrome) => (
              <WarehousePicker {...chrome} initialOptions={initialWarehouseOptions} />
            )}
          </FilterPickerChip>
          <FilterPickerChip<CategoryOption>
            value={selectedCategoryId}
            onChange={handleCategoryChange}
            selectedLabel={categoryFilter.selectedLabel}
            onOptionSelected={categoryFilter.onOptionSelected}
            nounSingular="Category"
            nounPlural="categories"
            subject="adjustments"
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
            subject="adjustments"
          >
            {(chrome) => <ProductPicker {...chrome} categoryId={selectedCategoryId} />}
          </FilterPickerChip>
        </ToolbarMenuButton>

        {/* Search — two grouped columns (Identity | Product) in a 2-column grid,
            mirroring the WO Filter menu. Adj # is the exact record-number match;
            the rest ILIKE their own column. Product bars resolve through the
            product join and share their source with the Products list. */}
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
            </div>
            <div className="flex flex-col gap-2">
              <FilterGroupLabel>Product</FilterGroupLabel>
              <ProductSearchControls
                values={productSearchValues}
                onChange={handleProductSearchChange}
                subject="adjustments"
              />
            </div>
          </div>
        </ToolbarMenuButton>

        {/* Export — column-picker + row-cap; exports the ticked rows, or the
            whole filtered set when nothing is ticked. */}
        <ListExportButton
          endpoint="/api/adjustments/export"
          query={exportQuery}
          columns={exportColumns}
          filename="adjustments-export.csv"
          selectedIds={selectedIds}
          onReauthRequired={reconnectGoogleForSheets}
        />
      </ListActionBar>

      <AdjustmentsTable
        rows={rows}
        selection={selection}
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
        columnWidths={columnWidths}
        onColumnWidthsChange={onColumnWidthsChange}
        // Net quantity total over the full filtered set (server aggregate).
        rollups={totals ? [{ label: "Net Quantity", value: totals.quantityNet }] : undefined}
      />
    </ListPageShell>
  )
}
