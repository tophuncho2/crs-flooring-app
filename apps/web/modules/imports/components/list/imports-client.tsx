"use client"

import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { SortToggle } from "@/components/features/sort"
import { useServerListController } from "@/controllers/list-view"
import {
  LIST_IMPORTS_PAGE_SIZE,
  type ImportsListFilters,
} from "@builders/application"
import type { ImportRow, TablePreferencePayload } from "@builders/domain"
import {
  IMPORTS_LIST_QUERY_KEY,
  listImportsRequest,
} from "@/modules/imports/data/list-imports-request"
import { useImportsListController } from "@/modules/imports/controllers/use-imports-list-controller"
import { ImportsTable } from "./imports-table"

const IMPORTS_ALLOWED_GROUP_FIELDS = ["warehouse", "manufacturer"] as const
const IMPORTS_ALLOWED_SORT_FIELDS = ["importNumber"] as const

export default function ImportsClient({
  initialTablePreferences,
  initialSearchQuery,
  initialIsAscendingSort,
  initialGroupField,
  initialPage,
}: {
  initialTablePreferences?: TablePreferencePayload | null
  initialSearchQuery: string
  initialIsAscendingSort: boolean
  initialGroupField: string | null
  initialPage: number
}) {
  const { message, pageError, openCreate, openImport } = useImportsListController()

  const {
    rows,
    total,
    searchQuery,
    sort,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSearchQueryChange,
    onToggleSortDirection,
  } = useServerListController<ImportRow, ImportsListFilters>({
    mode: "fetch",
    queryKey: [...IMPORTS_LIST_QUERY_KEY],
    listFn: listImportsRequest,
    initialSearchQuery,
    initialSort: { field: "importNumber", direction: initialIsAscendingSort ? "asc" : "desc" },
    initialGroupField,
    initialPage,
    pageSize: LIST_IMPORTS_PAGE_SIZE,
    tableKey: "imports-main",
    initialTablePreferences,
    allowedSortFields: IMPORTS_ALLOWED_SORT_FIELDS,
    allowedGroupFields: IMPORTS_ALLOWED_GROUP_FIELDS,
  })

  const isAscendingSort = sort?.direction !== "desc"

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
            onChange={() => onToggleSortDirection()}
            ascendingLabel="1-9"
            descendingLabel="9-1"
          />
          <span className="text-xs text-[var(--foreground)]/55">
            {rows.length} of {total} imports
          </span>
        </div>

        <ImportsTable
          rows={rows}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={total}
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
