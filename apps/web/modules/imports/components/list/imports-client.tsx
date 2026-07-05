"use client"

import { useCallback, useMemo } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import {
  DebouncedSearchControl,
  SearchControl,
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ListPageFeedback,
  ToolbarMenuButton,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import { usePickedOptionLabel } from "@/engines/picker"
import type { ImportsListFilters, ListInput } from "@builders/application"
import {
  LIST_IMPORTS_PAGE_SIZE,
  type ImportRow,
  type WarehouseOption,
} from "@builders/domain"
import {
  IMPORTS_LIST_QUERY_KEY,
  listImportsRequest,
} from "@/modules/imports/data/list-imports-request"
import { useImportsListController } from "@/modules/imports/controllers/list/use-imports-list-controller"
import { ImportsTable } from "./imports-table"
import { WarehouseFilterChip } from "./toolbar-controls/warehouse-filter-chip"

const IMPORTS_FILTERABLE_FIELDS = ["impNumber", "warehouseId"] as const

// The list-view engine stores every filter value as `string[]`. The app filter
// type carries a scalar (`impNumber`) alongside the `warehouseId` array, so we
// bridge the two the same way products does: an all-array engine view +
// adapters at the edge.
type EngineImportsFilters = {
  impNumber?: ReadonlyArray<string>
  warehouseId?: ReadonlyArray<string>
}

function toEngineFilters(app: ImportsListFilters): EngineImportsFilters {
  const out: EngineImportsFilters = {}
  if (app.impNumber && app.impNumber.length > 0) out.impNumber = [app.impNumber]
  if (app.warehouseId?.length) out.warehouseId = app.warehouseId
  return out
}

function toAppFilters(engine: EngineImportsFilters): ImportsListFilters {
  const out: ImportsListFilters = {}
  const impNumber = engine.impNumber?.[0]?.trim()
  if (impNumber) out.impNumber = impNumber
  if (engine.warehouseId?.length) out.warehouseId = engine.warehouseId
  return out
}

export default function ImportsClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialWarehouseOptions,
  initialSelectedWarehouse = null,
}: {
  initialSearchQuery: string
  initialPage: number
  initialFilters: ImportsListFilters
  initialWarehouseOptions: WarehouseOption[]
  initialSelectedWarehouse?: WarehouseOption | null
}) {
  const { message, pageError, openCreate, openImport } = useImportsListController()

  // Convert the engine's all-array filters back to the app shape before fetch.
  const adaptedListFn = useCallback(
    (input: ListInput<EngineImportsFilters>) =>
      listImportsRequest({
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
  } = useFetchListController<ImportRow, EngineImportsFilters>({
    mode: "fetch",
    queryKey: [...IMPORTS_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_IMPORTS_PAGE_SIZE,
    tableKey: "imports-main",
    filterableFields: IMPORTS_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const impNumberValue = filters.impNumber?.[0] ?? ""

  const handleImpNumberChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("impNumber", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const selectedWarehouseId = useMemo(() => {
    const ids = filters.warehouseId
    return ids && ids.length > 0 ? ids[0] : null
  }, [filters])

  const selectedWarehouseLabel = useMemo(() => {
    if (!selectedWarehouseId) return null
    if (
      initialSelectedWarehouse &&
      initialSelectedWarehouse.id === selectedWarehouseId
    ) {
      return initialSelectedWarehouse.name
    }
    const seeded = initialWarehouseOptions.find(
      (option) => option.id === selectedWarehouseId,
    )
    return seeded ? seeded.name : null
  }, [selectedWarehouseId, initialSelectedWarehouse, initialWarehouseOptions])

  const warehouseFilter = usePickedOptionLabel<WarehouseOption>(
    selectedWarehouseId,
    selectedWarehouseLabel,
    (option) => option.name,
  )

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (impNumberValue.trim().length > 0) return true
    if (selectedWarehouseId) return true
    return false
  }, [searchQuery, impNumberValue, selectedWarehouseId])

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  const handleWarehouseChange = useCallback(
    (id: string | null) => {
      onFilterChange("warehouseId", id ? [id] : [])
    },
    [onFilterChange],
  )

  // Each tool lights its own dot independently; `hasActiveFilters` stays the
  // ListActionBar clear-all signal. Filter = the warehouse picker; Search =
  // full-text PO # + the IMP # exact-number bar.
  const hasActiveFilterTool = useMemo(
    () => Boolean(selectedWarehouseId),
    [selectedWarehouseId],
  )

  const hasActiveSearchTool = useMemo(
    () =>
      searchQuery.trim().length > 0 || impNumberValue.trim().length > 0,
    [searchQuery, impNumberValue],
  )

  return (
    <ListPageShell>
      <ListCreateButtonPortal label="Import" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Imports"
        rowCount={rows.length}
        total={total}
        rowCountLabel="imports"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        {/* Filter — the warehouse picker, composed directly (NOT the
            self-triggering FilterControl). */}
        <ToolbarMenuButton
          label="Filter"
          icon={SlidersHorizontal}
          active={hasActiveFilterTool}
        >
          <WarehouseFilterChip
            value={selectedWarehouseId}
            selectedLabel={warehouseFilter.selectedLabel}
            onChange={handleWarehouseChange}
            onOptionSelected={warehouseFilter.onOptionSelected}
            initialOptions={initialWarehouseOptions}
          />
        </ToolbarMenuButton>

        {/* Search — full-text PO # + the IMP # exact-number bar, mirrors
            products. */}
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={hasActiveSearchTool}
        >
          <SearchControl
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
            placeholder="Search PO #"
          />
          <DebouncedSearchControl
            value={impNumberValue}
            onCommit={handleImpNumberChange}
            placeholder="IMP #"
            ariaLabel="Search imports by import number"
          />
        </ToolbarMenuButton>
      </ListActionBar>

      <ImportsTable
        rows={rows}
        onOpenImport={openImport}
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
