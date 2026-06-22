"use client"

import { useCallback, useMemo } from "react"
import {
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
  DebouncedSearchControl,
} from "@/engines/list-view"
import type { ListInput, JobTypesListFilters } from "@builders/application"
import {
  LIST_JOB_TYPES_PAGE_SIZE,
  type JobTypeListRow,
} from "@builders/domain"
import {
  JOB_TYPES_LIST_QUERY_KEY,
  listJobTypesRequest,
} from "@/modules/job-types/data/list-job-types-request"
import { useJobTypesListController } from "@/modules/job-types/controllers/list/use-job-types-list-controller"
import { JobTypesTable } from "./job-types-table"
import { AddJobTypeButton } from "./toolbar-controls/add-job-type-button"
import { JobTypesListSearch } from "./toolbar-controls/job-types-list-search"
import { JobTypesClearAll } from "./toolbar-controls/sub-controls/job-types-clear-all"
import { JobTypesRowCount } from "./toolbar-controls/sub-controls/job-types-row-count"

// The engine's filter map carries `string[]` only — wrap the scalar JT-number
// search in a 1-element array, mirroring the warehouse store-# bar pattern.
type EngineJobTypeFilters = {
  jobTypeNumber?: ReadonlyArray<string>
}

const JOB_TYPES_FILTERABLE_FIELDS = ["jobTypeNumber"] as const

function toEngineFilters(app: JobTypesListFilters): EngineJobTypeFilters {
  return app.jobTypeNumber ? { jobTypeNumber: [app.jobTypeNumber] } : {}
}

function toAppFilters(engine: EngineJobTypeFilters): JobTypesListFilters {
  const jobTypeNumber = engine.jobTypeNumber?.[0]?.trim()
  return jobTypeNumber ? { jobTypeNumber } : {}
}

export type JobTypesClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: JobTypesListFilters
}

export default function JobTypesClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
}: JobTypesClientProps) {
  const { message, pageError, openCreate, openJobType } = useJobTypesListController()

  // The engine's filter map carries `string[]` only — translate to the typed
  // scalar `JobTypesListFilters` at the listFn boundary.
  const adaptedListFn = useCallback(
    (input: ListInput<EngineJobTypeFilters>) =>
      listJobTypesRequest({
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
  } = useFetchListController<JobTypeListRow, EngineJobTypeFilters>({
    mode: "fetch",
    queryKey: [...JOB_TYPES_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_JOB_TYPES_PAGE_SIZE,
    tableKey: "job-types-main",
    filterableFields: JOB_TYPES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const jobTypeNumberValue = filters.jobTypeNumber?.[0] ?? ""

  const handleJobTypeNumberChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("jobTypeNumber", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(
    () => searchQuery.trim().length > 0 || jobTypeNumberValue.trim().length > 0,
    [searchQuery, jobTypeNumberValue],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

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
              Job Types
            </span>
          </div>
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <JobTypesListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <DebouncedSearchControl
                  value={jobTypeNumberValue}
                  onCommit={handleJobTypeNumberChange}
                  placeholder="JT #"
                  ariaLabel="Search job types by number"
                />
                <ListToolbarBottomRow
                  left={
                    <JobTypesClearAll
                      hasActive={hasActiveFilters}
                      onClick={handleClearAll}
                    />
                  }
                  right={<JobTypesRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <AddJobTypeButton onClick={() => openCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <JobTypesTable
        rows={rows}
        onOpenJobType={(row) => openJobType(row.id)}
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
