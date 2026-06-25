"use client"

import { useCallback, useMemo } from "react"
import {
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
  NumberSearchTabBody,
  type TableOptionsConfig,
} from "@/engines/list-view"
import type { ListInput, WarehousesListFilters } from "@builders/application"
import {
  LIST_WAREHOUSES_PAGE_SIZE,
  type WarehouseListRow,
} from "@builders/domain"
import {
  WAREHOUSE_LIST_QUERY_KEY,
  listWarehousesRequest,
} from "@/modules/warehouse/data/list-warehouse-request"
import { useWarehouseListController } from "@/modules/warehouse/controllers/list/use-warehouse-list-controller"
import { WarehouseTable } from "./warehouse-table"
import { AddWarehouseButton } from "./toolbar-controls/add-warehouse-button"
import { WarehouseListSearch } from "./toolbar-controls/warehouse-list-search"
import { WarehouseClearAll } from "./toolbar-controls/sub-controls/warehouse-clear-all"
import { WarehouseRowCount } from "./toolbar-controls/sub-controls/warehouse-row-count"

// The engine's filter map carries `string[]` only — wrap the scalar store-number
// search in a 1-element array, mirroring the inventory `# bar` pattern.
type EngineWarehouseFilters = {
  storeNumber?: ReadonlyArray<string>
}

const WAREHOUSE_FILTERABLE_FIELDS = ["storeNumber"] as const

function toEngineFilters(app: WarehousesListFilters): EngineWarehouseFilters {
  return app.storeNumber ? { storeNumber: [app.storeNumber] } : {}
}

function toAppFilters(engine: EngineWarehouseFilters): WarehousesListFilters {
  const storeNumber = engine.storeNumber?.[0]?.trim()
  return storeNumber ? { storeNumber } : {}
}

export type WarehouseClientProps = {
  initialSearchQuery: string
  initialStoreNumber: string
  initialPage: number
}

export default function WarehouseClient({
  initialSearchQuery,
  initialStoreNumber,
  initialPage,
}: WarehouseClientProps) {
  const { openCreate, openWarehouse } = useWarehouseListController()

  // The engine's filter map carries `string[]` only — translate to the typed
  // scalar `WarehousesListFilters` at the listFn boundary.
  const adaptedListFn = useCallback(
    (input: ListInput<EngineWarehouseFilters>) =>
      listWarehousesRequest({
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
  } = useFetchListController<WarehouseListRow, EngineWarehouseFilters>({
    mode: "fetch",
    queryKey: [...WAREHOUSE_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialStoreNumber ? { storeNumber: initialStoreNumber } : {}),
    pageSize: LIST_WAREHOUSES_PAGE_SIZE,
    filterableFields: WAREHOUSE_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const storeNumberValue = filters.storeNumber?.[0] ?? ""

  const handleStoreNumberChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("storeNumber", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  // Row-number search lives in the table's gutter "Menu" (a single "Store #"
  // tab) rather than the toolbar, mirroring the inventory list. Auto-commits on
  // debounce, so the menu stays open; the tab lights when a value is present.
  const tableOptions = useMemo<TableOptionsConfig>(
    () => ({
      tabs: [
        {
          key: "number",
          label: "Store #",
          active: storeNumberValue.trim().length > 0,
          render: () => (
            <NumberSearchTabBody
              value={storeNumberValue}
              onChange={handleStoreNumberChange}
              placeholder="Store #"
              ariaLabel="Search warehouses by store number"
            />
          ),
        },
      ],
    }),
    [storeNumberValue, handleStoreNumberChange],
  )

  const hasActiveFilters = useMemo(
    () => searchQuery.trim().length > 0 || storeNumberValue.trim().length > 0,
    [searchQuery, storeNumberValue],
  )

  const handleClearAll = useCallback(() => {
    onSearchQueryChange("")
    onClearAllFilters()
  }, [onSearchQueryChange, onClearAllFilters])

  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="mx-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <div>
          <div className="px-4 pt-3">
            <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
              Warehouse
            </span>
          </div>
          {/* pt-0 overrides ListToolbar's pt-4 so the tab's bottom edge meets
              the encased card's top edge (rounded-tl-none seam). */}
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <WarehouseListSearch query={searchQuery} onQueryChange={onSearchQueryChange} />
                <ListToolbarBottomRow
                  left={<WarehouseClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<WarehouseRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <AddWarehouseButton onClick={() => openCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <WarehouseTable
        rows={rows}
        onOpen={(row) => openWarehouse(row.id)}
        tableOptions={tableOptions}
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
    </div>
  )
}
