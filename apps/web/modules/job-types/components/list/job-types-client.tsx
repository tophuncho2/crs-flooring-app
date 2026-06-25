"use client"

import { useCallback, useMemo } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import {
  ListActionBar,
  ListCreateButtonPortal,
  ToolbarMenuButton,
  SearchControl,
  NumberSearchTabBody,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
  type TableOptionsConfig,
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
    () => searchQuery.trim().length > 0 || jobTypeNumberValue.trim().length > 0,
    [searchQuery, jobTypeNumberValue],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <div className="min-h-screen space-y-3 bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <ListCreateButtonPortal label="Job Type" onClick={() => openCreate()} />

      <div className="mx-4">
        {message || pageError ? (
          <div className="space-y-2 pb-2">
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

        <ListActionBar
          label="Job Types"
          rowCount={rows.length}
          total={total}
          rowCountLabel="job types"
          hasActiveFilters={hasActiveFilters}
          onClearAll={handleClearAll}
        >
          <ToolbarMenuButton
            label="Filter"
            icon={SlidersHorizontal}
            active={jobTypeNumberValue.trim().length > 0}
          >
            <NumberSearchTabBody
              value={jobTypeNumberValue}
              onChange={handleJobTypeNumberChange}
              placeholder="JT #"
              ariaLabel="Search job types by number"
            />
          </ToolbarMenuButton>
          <ToolbarMenuButton
            label="Search"
            icon={Search}
            active={searchQuery.trim().length > 0}
          >
            <SearchControl
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
              placeholder="Search job types"
            />
          </ToolbarMenuButton>
        </ListActionBar>

        <JobTypesTable
          rows={rows}
          onOpenJobType={(row) => openJobType(row.id)}
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
    </div>
  )
}
