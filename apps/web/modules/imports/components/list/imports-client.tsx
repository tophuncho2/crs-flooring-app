"use client"

import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { SortToggle } from "@/components/features/sort"
import { useConfiguredTableState } from "@/modules/shared/engines/list-view/controllers/use-configured-table-state"
import type { TablePreferencePayload } from "@/modules/shared/engines/list-view/controllers/table-preferences"
import {
  type ImportRow,
  useImportsListController,
} from "@/modules/imports/controllers/use-imports-list-controller"
import { ImportsTable } from "./imports-table"

type ServerPaginationState = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  previousPageHref: string
  nextPageHref: string
}

type ServerTableState = {
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
}

export default function ImportsClient({
  initialImports,
  initialTablePreferences,
  tableState,
  pagination,
}: {
  initialImports: ImportRow[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: ServerTableState
  pagination?: ServerPaginationState
}) {
  const { imports, message, pageError, openCreate, openImport } = useImportsListController({
    initialImports,
  })

  const {
    searchQuery,
    isAscendingSort,
    filteredRows: filteredImports,
    sortedRows: sortedImports,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSearchQueryChange,
    onToggleSort,
  } = useConfiguredTableState({
    rows: imports,
    tableKey: "imports-main",
    fields: [
      { key: "importNumber", label: "Import #", getValue: (row) => `IMP-${String(row.importNumber).padStart(4, "0")}`, groupable: false },
      { key: "tag", label: "Tag", getValue: (row) => row.tag, groupable: false },
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.warehouseName, groupable: true },
      { key: "manufacturer", label: "Manufacturer", getValue: (row) => row.manufacturerName, groupable: true },
      { key: "percent", label: "Percent", getValue: (row) => row.percent, groupable: false },
      { key: "stagedRows", label: "Staged", getValue: (row) => String(row.stagedInventoryRowsCount), groupable: false },
      { key: "liveRows", label: "Live", getValue: (row) => String(row.liveInventoryRowsCount), groupable: false },
      { key: "created", label: "Created", getValue: (row) => row.createdAt, groupable: false },
    ],
    sortField: (row) => String(row.importNumber),
    sortFieldKey: "importNumber",
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
    initialPreferences: initialTablePreferences,
  })

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Imports"
          actions={[{ key: "new", label: "+ Import", onClick: () => openCreate(), kind: "primary" }]}
        />

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

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] px-4 py-3">
          <div className="min-w-[16rem] flex-1">
            <SearchControl
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
              placeholder="Search import # or tag"
            />
          </div>
          <SortToggle
            sortKey="importNumber"
            direction={isAscendingSort ? "asc" : "desc"}
            onChange={() => onToggleSort()}
            ascendingLabel="1-9"
            descendingLabel="9-1"
          />
          <span className="text-xs text-[var(--foreground)]/55">
            {filteredImports.length} of {imports.length} imports
          </span>
        </div>

        <ImportsTable
          rows={sortedImports}
          pagination={pagination}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredImports.length}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onOpenImport={openImport}
        />
      </div>
    </div>
  )
}
