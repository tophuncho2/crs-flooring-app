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
import { usePropertySidePanel } from "@/modules/properties/controllers/use-property-side-panel"
import { usePropertyHubSidePanel } from "@/modules/properties/controllers/list/use-property-hub-side-panel"
import { PropertySidePanel } from "@/modules/properties/components/side-panel"
import { PropertyHubSidePanel } from "@/modules/properties/components/side-panel/hub"
import { PropertiesTable } from "./properties-table"
import { AddHubButton } from "./toolbar-controls/add-hub-button"
import { AddPropertyButton } from "./toolbar-controls/add-property-button"
import { StateFilterChip } from "./toolbar-controls/state-filter-chip"
import { ManagementCompanyFilterChip } from "./toolbar-controls/management-company-filter-chip"
import { PropertiesListSearch } from "./toolbar-controls/properties-list-search"
import { PropertiesClearAll } from "./toolbar-controls/sub-controls/properties-clear-all"
import { PropertiesRowCount } from "./toolbar-controls/sub-controls/properties-row-count"

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
  const { message, pageError } = usePropertiesListController()
  const sidePanel = usePropertySidePanel()
  const hubPanel = usePropertyHubSidePanel()

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

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (selectedManagementCompanyId) return true
    return false
  }, [searchQuery, selectedManagementCompanyId])

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
              Properties
            </span>
          </div>
          {/* pt-0 overrides ListToolbar's pt-4 so the tab's bottom edge meets
              the encased card's top edge (rounded-tl-none seam). */}
          <ListToolbar className="pt-0">
            {/* Search + (Clear all | row count) — encased card attached to the tab above */}
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <PropertiesListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <ListToolbarBottomRow
                  left={<PropertiesClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<PropertiesRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            {/* Management Company */}
            <ListToolbarCell>
              <ManagementCompanyFilterChip
                value={selectedManagementCompanyId}
                selectedLabel={selectedManagementCompanyLabel}
                onChange={handleManagementCompanyChange}
                initialOptions={initialManagementCompanyOptions}
              />
            </ListToolbarCell>

            {/* State: placeholder chip for now; will be wired once the
                properties list filter contract accepts a state code. */}
            <ListToolbarCell>
              <StateFilterChip />
            </ListToolbarCell>

            {/* Right-anchored actions stacked vertically: + Property on top,
                + Hub below. */}
            <ListToolbarCell className="ml-auto">
              <AddPropertyButton onClick={() => sidePanel.openPanel({ mode: "create" })} />
              <AddHubButton onClick={() => hubPanel.open()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>

        <PropertiesTable
          rows={rows}
          onOpenProperty={(row) => sidePanel.openPanel({ mode: "edit", row })}
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
      <PropertySidePanel controller={sidePanel} />
      <PropertyHubSidePanel controller={hubPanel} />
    </div>
  )
}
