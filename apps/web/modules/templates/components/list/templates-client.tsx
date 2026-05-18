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
import { AddTemplateButton } from "./toolbar-controls/add-template-button"
import { ManagementCompanyFilterChip } from "./toolbar-controls/management-company-filter-chip"
import { PropertyFilterChip } from "./toolbar-controls/property-filter-chip"
import { TemplatesListSearch } from "./toolbar-controls/templates-list-search"
import { TemplatesClearAll } from "./toolbar-controls/sub-controls/templates-clear-all"
import { TemplatesRowCount } from "./toolbar-controls/sub-controls/templates-row-count"

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
    onClearAllFilters,
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

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (selectedManagementCompanyId || selectedPropertyId) return true
    return false
  }, [searchQuery, selectedManagementCompanyId, selectedPropertyId])

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
              Templates
            </span>
          </div>
          {/* pt-0 overrides ListToolbar's pt-4 so the tab's bottom edge meets
              the encased card's top edge (rounded-tl-none seam). */}
          <ListToolbar className="pt-0">
            {/* Search + (Clear all | row count) — encased card attached to the tab above */}
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <TemplatesListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <ListToolbarBottomRow
                  left={<TemplatesClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<TemplatesRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            {/* Management Company → Property: property is MC-scoped (MC change
                cascades the property chip clear via handleManagementCompanyChange). */}
            <ListToolbarCell>
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
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <AddTemplateButton onClick={() => openCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>

        <TemplatesTable
          rows={rows}
          onOpen={(row) => openTemplate(row.id)}
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
    </div>
  )
}
