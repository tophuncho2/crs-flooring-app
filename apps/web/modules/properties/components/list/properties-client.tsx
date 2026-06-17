"use client"

import { useCallback, useMemo } from "react"
import { ListToolbar, ListToolbarBottomRow, ListToolbarCell, StateSearchControl, useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import type { PropertiesListFilters } from "@builders/application"
import {
  LIST_PROPERTIES_PAGE_SIZE,
  normalizeAddressState,
  type ManagementCompanyOption,
  type PropertyListRow,
} from "@builders/domain"
import {
  PROPERTIES_LIST_QUERY_KEY,
  listPropertiesRequest,
} from "@/modules/properties/data/list-properties-request"
import { usePropertiesListController } from "@/modules/properties/controllers/use-properties-list-controller"
import { useRecordEntryNavigation } from "@/hooks/navigation/use-record-entry-navigation"
import { useRouter } from "next/navigation"
import { buildPropertyRecordHref, buildRecordCreateHref } from "@/hooks/navigation/routes"
import { PropertiesTable } from "./properties-table"
import { AddHubButton } from "./toolbar-controls/add-hub-button"
import { ManagementCompanyFilterChip } from "./toolbar-controls/management-company-filter-chip"
import { PropertiesListSearch } from "./toolbar-controls/properties-list-search"
import { PropertiesClearAll } from "./toolbar-controls/sub-controls/properties-clear-all"
import { PropertiesRowCount } from "./toolbar-controls/sub-controls/properties-row-count"

const PROPERTIES_FILTERABLE_FIELDS = ["managementCompanyId", "state"] as const

export type PropertiesClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: PropertiesListFilters
  initialManagementCompanyOptions: ManagementCompanyOption[]
  initialSelectedManagementCompany?: ManagementCompanyOption | null
}

export default function PropertiesClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialManagementCompanyOptions,
  initialSelectedManagementCompany = null,
}: PropertiesClientProps) {
  const { message, pageError } = usePropertiesListController()
  const router = useRouter()
  // Properties have no record page of their own — a row opens its management
  // company's record view drilled into the property (or the MC create flow when
  // the property has no MC). `returnTo` brings the user back to this list.
  const { returnTo } = useRecordEntryNavigation("/dashboard/properties")

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
  } = useFetchListController<PropertyListRow, PropertiesListFilters>({
    mode: "fetch",
    queryKey: [...PROPERTIES_LIST_QUERY_KEY],
    listFn: listPropertiesRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: LIST_PROPERTIES_PAGE_SIZE,
    tableKey: "properties-main",
    filterableFields: PROPERTIES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const selectedManagementCompanyId =
    (filters as PropertiesListFilters).managementCompanyId?.[0] ?? null

  const selectedManagementCompanyLabel = useMemo(() => {
    if (!selectedManagementCompanyId) return null
    if (initialSelectedManagementCompany?.id === selectedManagementCompanyId) {
      return initialSelectedManagementCompany.name
    }
    return (
      initialManagementCompanyOptions.find(
        (option) => option.id === selectedManagementCompanyId,
      )?.name ?? null
    )
  }, [
    selectedManagementCompanyId,
    initialSelectedManagementCompany,
    initialManagementCompanyOptions,
  ])

  const handleManagementCompanyChange = useCallback(
    (id: string | null) => {
      onFilterChange("managementCompanyId", id ? [id] : [])
    },
    [onFilterChange],
  )

  const selectedState =
    (filters as PropertiesListFilters).state?.[0] ?? null

  const handleStateChange = useCallback(
    (next: string | null) => {
      const normalized = next ? normalizeAddressState(next) : ""
      onFilterChange("state", normalized.length === 2 ? [normalized] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (selectedManagementCompanyId) return true
    if (selectedState) return true
    return false
  }, [searchQuery, selectedManagementCompanyId, selectedState])

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
              Properties
            </span>
          </div>
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <PropertiesListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <StateSearchControl
                  value={selectedState}
                  onChange={handleStateChange}
                  ariaLabel="Filter properties by state"
                />
                <ListToolbarBottomRow
                  left={<PropertiesClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<PropertiesRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            <ListToolbarCell>
              <ManagementCompanyFilterChip
                value={selectedManagementCompanyId}
                selectedLabel={selectedManagementCompanyLabel}
                onChange={handleManagementCompanyChange}
                initialOptions={initialManagementCompanyOptions}
              />
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

      <PropertiesTable
        rows={rows}
        onOpenProperty={(row) =>
          router.push(buildPropertyRecordHref(row.id, row.managementCompany?.id ?? null, returnTo))
        }
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
