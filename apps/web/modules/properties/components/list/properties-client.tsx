"use client"

import { useMemo } from "react"
import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { useServerListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { PropertiesListFilters } from "@builders/application"
import {
  LIST_PROPERTIES_PAGE_SIZE,
  type ManagementCompanyOption,
  type PropertyListRow,
  type TablePreferencePayload,
} from "@builders/domain"
import {
  PROPERTIES_LIST_QUERY_KEY,
  listPropertiesRequest,
} from "@/modules/properties/data/list-properties-request"
import { usePropertiesListController } from "@/modules/properties/controllers/use-properties-list-controller"
import { ManagementCompanyFilterChip } from "./management-company-filter-chip"
import { PropertiesTable } from "./properties-table"

const PROPERTIES_FILTERABLE_FIELDS = ["managementCompanyId"] as const

export type PropertiesClientProps = {
  initialTablePreferences?: TablePreferencePayload | null
  initialSearchQuery: string
  initialPage: number
  initialFilters: PropertiesListFilters
  initialManagementCompanyOptions: ManagementCompanyOption[]
  initialSelectedManagementCompany?: ManagementCompanyOption | null
}

export default function PropertiesClient({
  initialTablePreferences,
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialManagementCompanyOptions,
  initialSelectedManagementCompany = null,
}: PropertiesClientProps) {
  const { message, pageError, openCreate, openProperty } = usePropertiesListController()

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
  } = useServerListController<PropertyListRow, PropertiesListFilters>({
    mode: "fetch",
    queryKey: [...PROPERTIES_LIST_QUERY_KEY],
    listFn: listPropertiesRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: LIST_PROPERTIES_PAGE_SIZE,
    tableKey: "properties-main",
    initialTablePreferences,
    filterableFields: PROPERTIES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const selectedManagementCompanyId = useMemo(() => {
    const ids = (filters as PropertiesListFilters).managementCompanyId
    return ids && ids.length > 0 ? ids[0] : null
  }, [filters])

  const selectedManagementCompanyLabel = useMemo(() => {
    if (!selectedManagementCompanyId) return null
    if (
      initialSelectedManagementCompany &&
      initialSelectedManagementCompany.id === selectedManagementCompanyId
    ) {
      return initialSelectedManagementCompany.name
    }
    const seeded = initialManagementCompanyOptions.find(
      (option) => option.id === selectedManagementCompanyId,
    )
    return seeded ? seeded.name : null
  }, [
    selectedManagementCompanyId,
    initialSelectedManagementCompany,
    initialManagementCompanyOptions,
  ])

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Properties"
          actions={[{ key: "new", label: "+ Property", onClick: () => openCreate(), kind: "primary" }]}
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
              placeholder="Search property"
            />
          </div>
          <ManagementCompanyFilterChip
            value={selectedManagementCompanyId}
            selectedLabel={selectedManagementCompanyLabel}
            onChange={(id) =>
              onFilterChange("managementCompanyId", id ? [id] : [])
            }
          />
          <span className="text-xs text-[var(--foreground)]/55">
            {rows.length} of {total} properties
          </span>
        </div>

        <PropertiesTable
          rows={rows}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={total}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onOpenProperty={openProperty}
        />
      </div>
    </div>
  )
}
