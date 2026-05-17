"use client"

import { useCallback, useMemo } from "react"
import { SectionHeader } from "@/components/headers"
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
        <SectionHeader title="Management Companies" />

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

        <ListToolbar>
          {/* Search + (Clear all | row count) */}
          <ListToolbarCell>
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
          </ListToolbarCell>

          {/* Right-anchored actions: + Company, + Hub. */}
          <div className="ml-auto flex items-start gap-2">
            <AddCompanyButton onClick={() => sidePanel.openPanel({ mode: "create" })} />
            <AddHubButton />
          </div>
        </ListToolbar>

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
