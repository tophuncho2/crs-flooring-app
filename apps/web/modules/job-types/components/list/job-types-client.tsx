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
import type { JobTypesListFilters } from "@builders/application"
import {
  LIST_JOB_TYPES_PAGE_SIZE,
  type JobTypeListRow,
} from "@builders/domain"
import {
  JOB_TYPES_LIST_QUERY_KEY,
  listJobTypesRequest,
} from "@/modules/job-types/data/list-job-types-request"
import { useJobTypesListController } from "@/modules/job-types/controllers/list/use-job-types-list-controller"
import { useJobTypeSidePanel } from "@/modules/job-types/controllers/side-panel"
import { JobTypeSidePanel } from "@/modules/job-types/components/side-panel/job-type-side-panel"
import { JobTypesTable } from "./job-types-table"
import { AddJobTypeButton } from "./toolbar-controls/add-job-type-button"
import { JobTypesListSearch } from "./toolbar-controls/job-types-list-search"
import { JobTypesClearAll } from "./toolbar-controls/sub-controls/job-types-clear-all"
import { JobTypesRowCount } from "./toolbar-controls/sub-controls/job-types-row-count"

const JOB_TYPES_FILTERABLE_FIELDS = [] as const

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
  const { message, pageError } = useJobTypesListController()
  const sidePanel = useJobTypeSidePanel()

  const {
    rows,
    total,
    searchQuery,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSearchQueryChange,
    onClearAllFilters,
  } = useServerListController<JobTypeListRow, JobTypesListFilters>({
    mode: "fetch",
    queryKey: [...JOB_TYPES_LIST_QUERY_KEY],
    listFn: listJobTypesRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: LIST_JOB_TYPES_PAGE_SIZE,
    tableKey: "job-types-main",
    filterableFields: JOB_TYPES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const hasActiveFilters = useMemo(() => searchQuery.trim().length > 0, [searchQuery])

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

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
              Job Types
            </span>
          </div>
          <ListToolbar className="pt-0">
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <JobTypesListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
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
              <AddJobTypeButton onClick={() => sidePanel.openForCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>

        <JobTypesTable
          rows={rows}
          onOpenJobType={(row) => sidePanel.openForEdit(row)}
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
      <JobTypeSidePanel controller={sidePanel} />
    </div>
  )
}
