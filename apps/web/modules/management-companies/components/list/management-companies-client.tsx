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
import type { ManagementCompaniesListFilters } from "@builders/application"
import {
  LIST_MANAGEMENT_COMPANIES_PAGE_SIZE,
  type ManagementCompanyListRow,
  type TablePreferencePayload,
} from "@builders/domain"
import {
  MANAGEMENT_COMPANIES_LIST_QUERY_KEY,
  listManagementCompaniesRequest,
} from "@/modules/management-companies/data/list-management-companies-request"
import { useManagementCompaniesListController } from "@/modules/management-companies/controllers/use-management-companies-list-controller"
import { useManagementCompanySidePanel } from "@/modules/management-companies/controllers/use-management-company-side-panel"
import { ManagementCompanySidePanel } from "@/modules/management-companies/components/side-panel"
import { ManagementCompaniesTable } from "./management-companies-table"
import { AddCompanyButton } from "./toolbar-controls/add-company-button"
import { AddHubButton } from "./toolbar-controls/add-hub-button"
import { ManagementCompaniesListSearch } from "./toolbar-controls/management-companies-list-search"
import { ManagementCompaniesClearAll } from "./toolbar-controls/sub-controls/management-companies-clear-all"
import { ManagementCompaniesRowCount } from "./toolbar-controls/sub-controls/management-companies-row-count"

export type ManagementCompaniesClientProps = {
  initialTablePreferences?: TablePreferencePayload | null
  initialSearchQuery: string
  initialPage: number
}

export default function ManagementCompaniesClient({
  initialTablePreferences,
  initialSearchQuery,
  initialPage,
}: ManagementCompaniesClientProps) {
  const { message, pageError } = useManagementCompaniesListController()
  const sidePanel = useManagementCompanySidePanel()

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
  } = useServerListController<ManagementCompanyListRow, ManagementCompaniesListFilters>({
    mode: "fetch",
    queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY],
    listFn: listManagementCompaniesRequest,
    initialSearchQuery,
    initialPage,
    pageSize: LIST_MANAGEMENT_COMPANIES_PAGE_SIZE,
    tableKey: "management-companies-main",
    initialTablePreferences,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const hasActiveFilters = useMemo(
    () => searchQuery.trim().length > 0,
    [searchQuery],
  )

  const handleClearAll = useCallback(() => {
    onSearchQueryChange("")
  }, [onSearchQueryChange])

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
              Management Companies
            </span>
          </div>
          {/* pt-0 overrides ListToolbar's pt-4 so the tab's bottom edge meets
              the encased card's top edge (rounded-tl-none seam). */}
          <ListToolbar className="pt-0">
            {/* Search + (Clear all | row count) — encased card attached to the tab above */}
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <ManagementCompaniesListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <ListToolbarBottomRow
                  left={
                    <ManagementCompaniesClearAll
                      hasActive={hasActiveFilters}
                      onClick={handleClearAll}
                    />
                  }
                  right={<ManagementCompaniesRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            {/* Right-anchored actions stacked vertically: + Company on top,
                + Hub below. */}
            <ListToolbarCell className="ml-auto">
              <AddCompanyButton onClick={() => sidePanel.openPanel({ mode: "create" })} />
              <AddHubButton />
            </ListToolbarCell>
          </ListToolbar>
        </div>

        <ManagementCompaniesTable
          rows={rows}
          onOpenCompany={(row) => sidePanel.openPanel({ mode: "edit", row })}
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
      <ManagementCompanySidePanel controller={sidePanel} />
    </div>
  )
}
