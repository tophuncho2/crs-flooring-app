"use client"

import { useCallback, useMemo } from "react"
import { Search } from "lucide-react"
import {
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ToolbarMenuButton,
  SearchControl,
  NumberSearchTabBody,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
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

  // The gutter "Menu" stays as the home of the CSV export/print landing this
  // weekend; until then it shows a placeholder so the gutter chrome is ready.
  const tableOptions = useMemo<TableOptionsConfig>(
    () => ({
      ariaLabel: "Table menu",
      tabs: [
        {
          key: "csv",
          label: "Export",
          render: () => (
            <p className="px-1 py-2 text-xs text-[var(--foreground)]/55">
              Pending CSV export
            </p>
          ),
        },
      ],
    }),
    [],
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
    <ListPageShell>
      <ListCreateButtonPortal label="Warehouse" onClick={() => openCreate()} />

      <ListActionBar
        label="Warehouse"
        rowCount={rows.length}
        total={total}
        rowCountLabel="warehouses"
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
          <NumberSearchTabBody
            value={storeNumberValue}
            onChange={handleStoreNumberChange}
            placeholder="Store #"
            ariaLabel="Search warehouses by store number"
          />
        </ToolbarMenuButton>
      </ListActionBar>

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
    </ListPageShell>
  )
}
