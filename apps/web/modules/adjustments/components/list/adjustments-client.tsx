"use client"

import { useCallback, useMemo } from "react"
import { PaginateControls } from "@/components/features/paginate"
import {
  ListRowCount,
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
} from "@/components/features/list-toolbar"
import { SearchControl } from "@/components/features/search"
import { ClearAllFiltersButton } from "@/components/features/filter"
import { useFetchListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { ListInput } from "@builders/application"
import {
  INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
  type InventoryAdjustmentListFilters,
  type EnrichedInventoryAdjustmentRow,
  type WarehouseOption,
} from "@builders/domain"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { useInventoryHub } from "@/modules/app-shell/components/inventory-hub-provider"
import {
  ADJUSTMENTS_LIST_QUERY_KEY,
  listAdjustmentsRequest,
} from "@/modules/adjustments/data/list-adjustments-request"
import { AdjustmentsTable } from "./adjustments-table"

export default function AdjustmentsClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialWarehouseOptions,
  initialSelectedWarehouse = null,
}: {
  initialSearchQuery: string
  initialPage: number
  initialFilters: InventoryAdjustmentListFilters
  initialWarehouseOptions: WarehouseOption[]
  initialSelectedWarehouse?: WarehouseOption | null
}) {
  // Row click opens the app-wide inventory hub focused on the clicked adjustment.
  // `openForAdjustmentEdit(row)` derives the parent inventory from `row.inventoryId`
  // and loads it. The provider invalidates the ledger after any hub mutation so
  // it refreshes.
  const { openForAdjustmentEdit } = useInventoryHub()

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
  } = useFetchListController<EnrichedInventoryAdjustmentRow, InventoryAdjustmentListFilters>({
    mode: "fetch",
    queryKey: [...ADJUSTMENTS_LIST_QUERY_KEY],
    listFn: (input: ListInput<InventoryAdjustmentListFilters>) => listAdjustmentsRequest(input),
    initialSearchQuery,
    initialPage,
    initialFilters: initialFilters.warehouseId?.length
      ? { warehouseId: initialFilters.warehouseId }
      : {},
    pageSize: INVENTORY_ADJUSTMENTS_LIST_PAGE_SIZE,
    tableKey: "adjustments-main",
    filterableFields: ["warehouseId"],
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const selectedWarehouseId = filters.warehouseId?.[0] ?? null

  const warehouseLabel = useMemo(() => {
    if (!selectedWarehouseId) return null
    if (initialSelectedWarehouse?.id === selectedWarehouseId) {
      return initialSelectedWarehouse.name
    }
    return initialWarehouseOptions.find((o) => o.id === selectedWarehouseId)?.name ?? null
  }, [selectedWarehouseId, initialSelectedWarehouse, initialWarehouseOptions])

  const handleWarehouseChange = useCallback(
    (id: string | null) => {
      onFilterChange("warehouseId", id ? [id] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(
    () => searchQuery.trim().length > 0 || Boolean(selectedWarehouseId),
    [searchQuery, selectedWarehouseId],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

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
                <SearchControl
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                  placeholder="Search inventory item"
                />
                <ListToolbarBottomRow
                  left={
                    <ClearAllFiltersButton hasActive={hasActiveFilters} onClick={handleClearAll} />
                  }
                  right={<ListRowCount count={rows.length} total={total} label="adjustments" />}
                />
              </div>
            </ListToolbarCell>

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
              </div>
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <AdjustmentsTable
        rows={rows}
        onOpenAdjustment={(row) => openForAdjustmentEdit(row)}
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
