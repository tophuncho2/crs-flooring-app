"use client"

import { useCallback, useMemo } from "react"
import { Search } from "lucide-react"
import {
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ToolbarMenuButton,
  SearchControl,
  DebouncedSearchControl,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
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
    columnWidths,
    onColumnWidthsChange,
  } = useFetchListController<WarehouseListRow, EngineWarehouseFilters>({
    mode: "fetch",
    queryKey: [...WAREHOUSE_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialStoreNumber ? { storeNumber: initialStoreNumber } : {}),
    pageSize: LIST_WAREHOUSES_PAGE_SIZE,
    tableKey: "warehouse-main",
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

  const hasActiveFilters = useMemo(
    () => searchQuery.trim().length > 0 || storeNumberValue.trim().length > 0,
    [searchQuery, storeNumberValue],
  )

  const handleClearAll = useCallback(() => {
    onSearchQueryChange("")
    onClearAllFilters()
  }, [onSearchQueryChange, onClearAllFilters])

  return (
    <ListPageShell fill>
      <ListCreateButtonPortal label="Warehouse" onClick={() => openCreate()} />

      <ListActionBar
        label="Warehouse"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={searchQuery.trim().length > 0 || storeNumberValue.trim().length > 0}
        >
          <SearchControl
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
            placeholder="Search Warehouse Name"
          />
          <DebouncedSearchControl
            value={storeNumberValue}
            onCommit={handleStoreNumberChange}
            placeholder="Store #"
            ariaLabel="Search warehouses by store number"
          />
        </ToolbarMenuButton>
      </ListActionBar>

      <WarehouseTable
        rows={rows}
        onOpen={(row) => openWarehouse(row.id)}
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
      />
    </ListPageShell>
  )
}
