"use client"

import { useCallback, useMemo } from "react"
import { PaginateControls, ListRowCount, ListToolbar, ListToolbarBottomRow, ListToolbarCell, ListToolbarTallCard, DebouncedSearchControl, ClearAllFiltersButton, useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import type { ListInput } from "@builders/application"
import {
  INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
  type CategoryOption,
  type InventoryAdjustmentListFilters,
  type EnrichedInventoryAdjustmentRow,
  type ProductOption,
  type WarehouseOption,
} from "@builders/domain"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import { PurchaseOrderPicker } from "@/modules/inventory/components/picker/purchase-order-picker"
import { ImportNumberPicker } from "@/modules/inventory/components/picker/import-number-picker"
import { ArchiveSegmentedControl } from "@/modules/inventory/components/list/toolbar-controls/archive-segmented-control"
import { useRouter } from "next/navigation"
import { useRecordEntryNavigation } from "@/hooks/navigation/use-record-entry-navigation"
import { buildInventoryAdjustmentHref } from "@/hooks/navigation/routes"
import {
  ADJUSTMENTS_LIST_QUERY_KEY,
  listAdjustmentsRequest,
} from "@/modules/adjustments/data/list-adjustments-request"
import { AdjustmentsTable } from "./adjustments-table"

const ADJUSTMENTS_FILTERABLE_FIELDS = [
  "warehouseId",
  "categoryId",
  "productId",
  "importNumber",
  "purchaseOrderNumber",
  "isArchived",
  "invNumber",
  "rollNumber",
  "dyeLot",
  "note",
] as const

/**
 * Engine-side filter shape: the list-view engine's filter map carries `string[]`
 * only. The four identity search bars are free-text scalars, so we encode them
 * as 1-element arrays here and translate back to the typed
 * `InventoryAdjustmentListFilters` at the listFn boundary.
 */
type EngineAdjustmentFilters = {
  warehouseId?: ReadonlyArray<string>
  categoryId?: ReadonlyArray<string>
  productId?: ReadonlyArray<string>
  importNumber?: ReadonlyArray<string>
  purchaseOrderNumber?: ReadonlyArray<string>
  isArchived?: ReadonlyArray<string>
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
  if (app.importNumber?.length) out.importNumber = app.importNumber
  if (app.purchaseOrderNumber?.length) out.purchaseOrderNumber = app.purchaseOrderNumber
  if (app.isArchived !== undefined) out.isArchived = [app.isArchived ? "true" : "false"]
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
  if (engine.importNumber?.length) out.importNumber = engine.importNumber
  if (engine.purchaseOrderNumber?.length) out.purchaseOrderNumber = engine.purchaseOrderNumber
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
    onFilterChange,
    onClearAllFilters,
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
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const selectedWarehouseId = filters.warehouseId?.[0] ?? null
  const selectedCategoryId = filters.categoryId?.[0] ?? null
  const selectedProductId = filters.productId?.[0] ?? null
  const selectedPurchaseOrderNumber = filters.purchaseOrderNumber?.[0] ?? null
  const selectedImportNumber = filters.importNumber?.[0] ?? null
  const archivedRaw = filters.isArchived?.[0]
  const isArchivedValue =
    archivedRaw === "true" ? true : archivedRaw === "false" ? false : undefined
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

  // PO# and Import# are mutually exclusive — selecting one clears the other.
  // Both reach the parent inventory row through the `inventory` relation.
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
    (next: boolean | undefined) => {
      onFilterChange("isArchived", next === undefined ? [] : [next ? "true" : "false"])
    },
    [onFilterChange],
  )

  // One handler for all four identity search bars — encodes the free-text value
  // as a 1-element array (or empty to clear).
  const handleTextFilterChange = useCallback(
    (key: "invNumber" | "rollNumber" | "dyeLot" | "note", next: string) => {
      const trimmed = next.trim()
      onFilterChange(key, trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(
    () =>
      Boolean(selectedWarehouseId) ||
      Boolean(selectedCategoryId) ||
      Boolean(selectedProductId) ||
      Boolean(selectedPurchaseOrderNumber) ||
      Boolean(selectedImportNumber) ||
      isArchivedValue !== undefined ||
      Boolean(invNumberValue) ||
      Boolean(rollNumberValue) ||
      Boolean(dyeLotValue) ||
      Boolean(noteValue),
    [
      selectedWarehouseId,
      selectedCategoryId,
      selectedProductId,
      selectedPurchaseOrderNumber,
      selectedImportNumber,
      isArchivedValue,
      invNumberValue,
      rollNumberValue,
      dyeLotValue,
      noteValue,
    ],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
  }, [onClearAllFilters])

  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="mx-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <div>
          <div className="px-4 pt-3">
            <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
              Adjustments
            </span>
          </div>
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
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
                <ListToolbarBottomRow
                  left={
                    <ClearAllFiltersButton hasActive={hasActiveFilters} onClick={handleClearAll} />
                  }
                  right={<ListRowCount count={rows.length} total={total} label="adjustments" />}
                />
              </div>
            </ListToolbarCell>

            {/* Archived (parent inventory) + Import (PO#/IMP# pickers) — the
                import-identity + archive chips all target the parent inventory
                row. PO# and IMP# are mutually exclusive. */}
            <ListToolbarCell className="self-start">
              <ListToolbarTallCard label="Archived">
                <ArchiveSegmentedControl
                  value={isArchivedValue}
                  onChange={handleArchivedChange}
                />
              </ListToolbarTallCard>
              <ListToolbarTallCard label="Import">
                <div className="flex w-full flex-col gap-2">
                  <PurchaseOrderPicker
                    value={selectedPurchaseOrderNumber}
                    onChange={handlePurchaseOrderChange}
                    placeholder="PO#"
                    ariaLabel="Filter adjustments by parent inventory PO number"
                  />
                  <ImportNumberPicker
                    value={selectedImportNumber}
                    onChange={handleImportNumberChange}
                    placeholder="IMP#"
                    ariaLabel="Filter adjustments by parent inventory import number"
                  />
                </div>
              </ListToolbarTallCard>
            </ListToolbarCell>

            {/* One encased card: Warehouse, Category, Product stacked together.
                Product is category-scoped (category change cascades the product
                clear via handleCategoryChange). */}
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md border border-[var(--panel-border)] p-2">
                <WarehousePicker
                  value={selectedWarehouseId}
                  selectedLabel={warehouseLabel}
                  onChange={handleWarehouseChange}
                  initialOptions={initialWarehouseOptions}
                  placeholder="Warehouse"
                  searchPlaceholder="Search warehouses"
                  emptyMessage="No warehouses match"
                  clearLabel="Clear filter"
                  ariaLabel="Filter adjustments by warehouse"
                />
                <CategoryPicker
                  value={selectedCategoryId}
                  selectedLabel={categoryLabel}
                  onChange={handleCategoryChange}
                  initialOptions={initialCategoryOptions}
                  placeholder="Category"
                  searchPlaceholder="Search categories"
                  emptyMessage="No categories match"
                  clearLabel="Clear filter"
                  ariaLabel="Filter adjustments by category"
                />
                <ProductPicker
                  value={selectedProductId}
                  selectedLabel={productLabel}
                  onChange={handleProductChange}
                  categoryId={selectedCategoryId}
                  placeholder="Product"
                  searchPlaceholder="Search products"
                  emptyMessage="No products match"
                  clearLabel="Clear filter"
                  ariaLabel="Filter adjustments by product"
                />
              </div>
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <AdjustmentsTable
        rows={rows}
        onOpenAdjustment={(row) =>
          router.push(buildInventoryAdjustmentHref(row.inventoryId, row.id, returnTo))
        }
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
  )
}
