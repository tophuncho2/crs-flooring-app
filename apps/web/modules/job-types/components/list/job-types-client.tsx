"use client"

import { useCallback, useMemo } from "react"
import { Search } from "lucide-react"
import {
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ListPageFeedback,
  ToolbarMenuButton,
  SearchControl,
  DebouncedSearchControl,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
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

  const hasActiveFilters = useMemo(
    () => searchQuery.trim().length > 0 || jobTypeNumberValue.trim().length > 0,
    [searchQuery, jobTypeNumberValue],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <ListPageShell>
      <ListCreateButtonPortal label="Job Type" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Job Types"
        rowCount={rows.length}
        total={total}
        rowCountLabel="job types"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={searchQuery.trim().length > 0 || jobTypeNumberValue.trim().length > 0}
        >
          <SearchControl
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
            placeholder="Search job types"
          />
          <DebouncedSearchControl
            value={jobTypeNumberValue}
            onCommit={handleJobTypeNumberChange}
            placeholder="JT #"
            ariaLabel="Search job types by number"
          />
        </ToolbarMenuButton>
      </ListActionBar>

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
    </ListPageShell>
  )
}
