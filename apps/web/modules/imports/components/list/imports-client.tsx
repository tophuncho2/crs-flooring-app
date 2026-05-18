"use client"

import { useCallback, useMemo } from "react"
import { PaginateControls } from "@/components/features/paginate"
import {
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
} from "@/components/features/list-toolbar"
import { useServerListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { ImportsListFilters } from "@builders/application"
import {
  LIST_IMPORTS_PAGE_SIZE,
  type ImportRow,
  type TablePreferencePayload,
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

const IMPORTS_ALLOWED_GROUP_FIELDS = ["warehouse", "manufacturer"] as const
const IMPORTS_FILTERABLE_FIELDS = ["warehouseId"] as const

export default function ImportsClient({
  initialTablePreferences,
  initialSearchQuery,
  initialGroupField,
  initialPage,
  initialFilters,
  initialWarehouseOptions,
  initialSelectedWarehouse = null,
}: {
  initialTablePreferences?: TablePreferencePayload | null
  initialSearchQuery: string
  initialGroupField: string | null
  initialPage: number
  initialFilters: ImportsListFilters
  initialWarehouseOptions: WarehouseOption[]
  initialSelectedWarehouse?: WarehouseOption | null
}) {
  const { message, pageError, openCreate, openImport } = useImportsListController()

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
  } = useServerListController<ImportRow, ImportsListFilters>({
    mode: "fetch",
    queryKey: [...IMPORTS_LIST_QUERY_KEY],
    listFn: listImportsRequest,
    initialSearchQuery,
    initialGroupField,
    initialPage,
    initialFilters,
    pageSize: LIST_IMPORTS_PAGE_SIZE,
    tableKey: "imports-main",
    initialTablePreferences,
    allowedGroupFields: IMPORTS_ALLOWED_GROUP_FIELDS,
    filterableFields: IMPORTS_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const selectedWarehouseId = useMemo(() => {
    const ids = (filters as ImportsListFilters).warehouseId
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
    if (selectedWarehouseId) return true
    return false
  }, [searchQuery, selectedWarehouseId])

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
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
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
          <ListToolbar className="pt-0">
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

        <ImportsTable
          rows={rows}
          onOpenImport={openImport}
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
    </div>
  )
}
