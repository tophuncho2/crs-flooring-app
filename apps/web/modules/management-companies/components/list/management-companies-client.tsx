"use client"

import { useCallback, useMemo } from "react"
import { ListToolbar, ListToolbarBottomRow, ListToolbarCell, StateSearchControl, useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import type { ManagementCompaniesListFilters } from "@builders/application"
import {
  LIST_MANAGEMENT_COMPANIES_PAGE_SIZE,
  normalizeAddressState,
  type ManagementCompanyListRow,
} from "@builders/domain"
import {
  MANAGEMENT_COMPANIES_LIST_QUERY_KEY,
  listManagementCompaniesRequest,
} from "@/modules/management-companies/data/list-management-companies-request"
import { useManagementCompaniesListController } from "@/modules/management-companies/controllers/list/use-management-companies-list-controller"
import { useRecordEntryNavigation } from "@/hooks/navigation/use-record-entry-navigation"
import { useRouter } from "next/navigation"
import { buildRecordCreateHref } from "@/hooks/navigation/routes"
import { ManagementCompaniesTable } from "./management-companies-table"
import { AddHubButton } from "./toolbar-controls/add-hub-button"
import { ManagementCompaniesListSearch } from "./toolbar-controls/management-companies-list-search"
import { ManagementCompaniesClearAll } from "./toolbar-controls/sub-controls/management-companies-clear-all"
import { ManagementCompaniesRowCount } from "./toolbar-controls/sub-controls/management-companies-row-count"

const MANAGEMENT_COMPANIES_FILTERABLE_FIELDS = ["state"] as const

export type ManagementCompaniesClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: ManagementCompaniesListFilters
}

export default function ManagementCompaniesClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
}: ManagementCompaniesClientProps) {
  const { message, pageError } = useManagementCompaniesListController()
  const router = useRouter()
  const { openRecord: openManagementCompany, returnTo } = useRecordEntryNavigation(
    "/dashboard/management-companies",
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
  } = useFetchListController<ManagementCompanyListRow, ManagementCompaniesListFilters>({
    mode: "fetch",
    queryKey: [...MANAGEMENT_COMPANIES_LIST_QUERY_KEY],
    listFn: listManagementCompaniesRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: LIST_MANAGEMENT_COMPANIES_PAGE_SIZE,
    tableKey: "management-companies-main",
    filterableFields: MANAGEMENT_COMPANIES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const selectedState =
    (filters as ManagementCompaniesListFilters).state?.[0] ?? null

  const handleStateChange = useCallback(
    (next: string | null) => {
      const normalized = next ? normalizeAddressState(next) : ""
      onFilterChange("state", normalized.length === 2 ? [normalized] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (selectedState) return true
    return false
  }, [searchQuery, selectedState])

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
              Management Companies
            </span>
          </div>
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <ManagementCompaniesListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <StateSearchControl
                  value={selectedState}
                  onChange={handleStateChange}
                  ariaLabel="Filter management companies by state"
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

            <ListToolbarCell className="ml-auto">
              <AddHubButton
                onClick={() =>
                  router.push(buildRecordCreateHref("/dashboard/management-companies", { returnTo }))
                }
              />
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <ManagementCompaniesTable
        rows={rows}
        onOpenCompany={(row) => openManagementCompany(row.id)}
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
