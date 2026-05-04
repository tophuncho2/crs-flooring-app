"use client"

import { useCallback, useMemo } from "react"
import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { useServerListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { TemplatesListFilters } from "@builders/application"
import {
  LIST_TEMPLATES_PAGE_SIZE,
  type ManagementCompanyOption,
  type PropertyOption,
  type TablePreferencePayload,
  type TemplateListRow,
} from "@builders/domain"
import {
  listTemplatesRequest,
  TEMPLATES_LIST_QUERY_KEY,
} from "@/modules/templates/data/list-templates-request"
import { useTemplatesListController } from "@/modules/templates/controllers/use-templates-list-controller"
import { TemplatesTable } from "./templates-table"
import { ManagementCompanyFilterChip } from "./management-company-filter-chip"
import { PropertyFilterChip } from "./property-filter-chip"

const TEMPLATES_FILTERABLE_FIELDS = ["managementCompanyId", "propertyId"] as const

export default function TemplatesClient({
  initialTablePreferences,
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialManagementCompanyOptions,
  initialSelectedManagementCompany = null,
  initialSelectedProperty = null,
}: {
  initialTablePreferences?: TablePreferencePayload | null
  initialSearchQuery: string
  initialPage: number
  initialFilters: TemplatesListFilters
  initialManagementCompanyOptions: ManagementCompanyOption[]
  initialSelectedManagementCompany?: ManagementCompanyOption | null
  initialSelectedProperty?: PropertyOption | null
}) {
  const { message, pageError, openCreate, openTemplate } = useTemplatesListController()

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
  } = useServerListController<TemplateListRow, TemplatesListFilters>({
    mode: "fetch",
    queryKey: [...TEMPLATES_LIST_QUERY_KEY],
    listFn: listTemplatesRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: LIST_TEMPLATES_PAGE_SIZE,
    tableKey: "templates-main",
    initialTablePreferences,
    filterableFields: TEMPLATES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const filtersTyped = filters as TemplatesListFilters
  const selectedManagementCompanyId = filtersTyped.managementCompanyId?.[0] ?? null
  const selectedPropertyId = filtersTyped.propertyId?.[0] ?? null

  const managementCompanyLabel = useMemo(() => {
    if (!selectedManagementCompanyId) return null
    if (initialSelectedManagementCompany?.id === selectedManagementCompanyId) {
      return initialSelectedManagementCompany.name
    }
    return (
      initialManagementCompanyOptions.find((o) => o.id === selectedManagementCompanyId)
        ?.name ?? null
    )
  }, [
    selectedManagementCompanyId,
    initialSelectedManagementCompany,
    initialManagementCompanyOptions,
  ])

  const propertyLabel = useMemo(() => {
    if (!selectedPropertyId) return null
    return initialSelectedProperty?.id === selectedPropertyId
      ? initialSelectedProperty.name
      : null
  }, [selectedPropertyId, initialSelectedProperty])

  // Cascade-clear: changing MC clears Property (its picker scope is gone).
  const handleManagementCompanyChange = useCallback(
    (id: string | null) => {
      onFilterChange("managementCompanyId", id ? [id] : [])
      onFilterChange("propertyId", [])
    },
    [onFilterChange],
  )

  const handlePropertyChange = useCallback(
    (id: string | null) => {
      onFilterChange("propertyId", id ? [id] : [])
    },
    [onFilterChange],
  )

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Templates"
          actions={[
            {
              key: "new",
              label: "+ Template",
              onClick: () => openCreate(),
              kind: "primary",
            },
          ]}
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
              placeholder="Search template #, unit type, or description"
            />
          </div>

          <ManagementCompanyFilterChip
            value={selectedManagementCompanyId}
            selectedLabel={managementCompanyLabel}
            onChange={handleManagementCompanyChange}
            initialOptions={initialManagementCompanyOptions}
          />
          <PropertyFilterChip
            value={selectedPropertyId}
            selectedLabel={propertyLabel}
            managementCompanyId={selectedManagementCompanyId}
            onChange={handlePropertyChange}
          />

          <span className="text-xs text-[var(--foreground)]/55">
            {rows.length} of {total} templates
          </span>
        </div>

        <TemplatesTable
          rows={rows}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={total}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onOpen={(row) => openTemplate(row.id)}
        />
      </div>
    </div>
  )
}
