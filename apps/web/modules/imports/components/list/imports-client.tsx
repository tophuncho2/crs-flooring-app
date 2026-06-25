"use client"

import { useCallback, useMemo } from "react"
import { NumberSearchTabBody, ListToolbar, ListToolbarBottomRow, ListToolbarCell, useFetchListController, LIST_FRESHNESS_STANDARD, type TableOptionsConfig } from "@/engines/list-view"
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
import { AddImportButton } from "./toolbar-controls/add-import-button"
import { ImportsListSearch } from "./toolbar-controls/imports-list-search"
import { WarehouseFilterChip } from "./toolbar-controls/warehouse-filter-chip"
import { ImportsClearAll } from "./toolbar-controls/sub-controls/imports-clear-all"
import { ImportsRowCount } from "./toolbar-controls/sub-controls/imports-row-count"

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

  // Row-number exact search lives in the table's gutter TableOptions menu (a
  // single "IMP #" tab) rather than the toolbar, matching inventory's menu.
  // The bar auto-commits on debounce, so the tab needs no Apply / close().
  const tableOptions = useMemo<TableOptionsConfig>(
    () => ({
      tabs: [
        {
          key: "number",
          label: "IMP #",
          active: impNumberValue.trim().length > 0,
          render: () => (
            <NumberSearchTabBody
              value={impNumberValue}
              onChange={handleImpNumberChange}
              placeholder="IMP #"
              ariaLabel="Search imports by import number"
            />
          ),
        },
      ],
    }),
    [impNumberValue, handleImpNumberChange],
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

  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="mx-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        {message || pageError ? (
          <div className="space-y-2 border-b border-[var(--panel-border)] px-4 py-3">
            {message ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
                {message}
              </div>
            ) : null}
            {pageError ? (
              <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
                {pageError}
              </div>
            ) : null}
          </div>
        ) : null}

        <div>
          <div className="px-4 pt-3">
            <span className="inline-block rounded-t-md border border-b-0 border-[var(--panel-border)] bg-blue-500/15 px-3 py-1 text-xs font-bold text-black">
              Imports
            </span>
          </div>
          {/* pt-0 overrides ListToolbar's pt-4 so the tab's bottom edge meets
              the encased card's top edge (rounded-tl-none seam). */}
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <ImportsListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <ListToolbarBottomRow
                  left={<ImportsClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<ImportsRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            <ListToolbarCell>
              <WarehouseFilterChip
                value={selectedWarehouseId}
                selectedLabel={selectedWarehouseLabel}
                onChange={handleWarehouseChange}
                initialOptions={initialWarehouseOptions}
              />
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <AddImportButton onClick={() => openCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <ImportsTable
        rows={rows}
        onOpenImport={openImport}
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
