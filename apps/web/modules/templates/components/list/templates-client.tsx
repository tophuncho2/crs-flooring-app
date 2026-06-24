"use client"

import { useCallback, useMemo } from "react"
import { ListToolbar, ListToolbarBottomRow, ListToolbarCell, useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import type { TemplatesListFilters } from "@builders/application"
import {
  LIST_TEMPLATES_PAGE_SIZE,
  type EntityOption,
  type PropertyOption,
  type TemplateListRow,
} from "@builders/domain"
import {
  listTemplatesRequest,
  TEMPLATES_LIST_QUERY_KEY,
} from "@/modules/templates/data/list-templates-request"
import { useTemplatesListController } from "@/modules/templates/controllers/list/use-templates-list-controller"
import { TemplatesTable } from "./templates-table"
import { AddTemplateButton } from "./toolbar-controls/add-template-button"
import { EntityFilterChip } from "./toolbar-controls/entity-filter-chip"
import { PropertyFilterChip } from "./toolbar-controls/property-filter-chip"
import { TemplatesListSearch } from "./toolbar-controls/templates-list-search"
import { TemplatesClearAll } from "./toolbar-controls/sub-controls/templates-clear-all"
import { TemplatesRowCount } from "./toolbar-controls/sub-controls/templates-row-count"

const TEMPLATES_FILTERABLE_FIELDS = ["entityId", "propertyId"] as const

export default function TemplatesClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialEntityOptions,
  initialSelectedEntity = null,
  initialSelectedProperty = null,
}: {
  initialSearchQuery: string
  initialPage: number
  initialFilters: TemplatesListFilters
  initialEntityOptions: EntityOption[]
  initialSelectedEntity?: EntityOption | null
  initialSelectedProperty?: PropertyOption | null
}) {
  const { message, pageError, openCreate, openTemplate, syncTemplate, syncingId } =
    useTemplatesListController()

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
  } = useFetchListController<TemplateListRow, TemplatesListFilters>({
    mode: "fetch",
    queryKey: [...TEMPLATES_LIST_QUERY_KEY],
    listFn: listTemplatesRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: LIST_TEMPLATES_PAGE_SIZE,
    tableKey: "templates-main",
    filterableFields: TEMPLATES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const filtersTyped = filters as TemplatesListFilters
  const selectedEntityId = filtersTyped.entityId?.[0] ?? null
  const selectedPropertyId = filtersTyped.propertyId?.[0] ?? null

  const entityLabel = useMemo(() => {
    if (!selectedEntityId) return null
    if (initialSelectedEntity?.id === selectedEntityId) {
      return initialSelectedEntity.entity
    }
    return (
      initialEntityOptions.find((o) => o.id === selectedEntityId)
        ?.entity ?? null
    )
  }, [
    selectedEntityId,
    initialSelectedEntity,
    initialEntityOptions,
  ])

  const propertyLabel = useMemo(() => {
    if (!selectedPropertyId) return null
    return initialSelectedProperty?.id === selectedPropertyId
      ? initialSelectedProperty.name
      : null
  }, [selectedPropertyId, initialSelectedProperty])

  // Cascade-clear: changing entity clears Property (its picker scope is gone).
  const handleEntityChange = useCallback(
    (id: string | null) => {
      onFilterChange("entityId", id ? [id] : [])
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
    if (selectedEntityId || selectedPropertyId) return true
    return false
  }, [searchQuery, selectedEntityId, selectedPropertyId])

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
              Templates
            </span>
          </div>
          {/* pt-0 overrides ListToolbar's pt-4 so the tab's bottom edge meets
              the encased card's top edge (rounded-tl-none seam). */}
          <ListToolbar className="pt-0" showDivider={false}>
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

            {/* Entity → Property: property is entity-scoped (entity change
                cascades the property chip clear via handleEntityChange). */}
            <ListToolbarCell>
              <EntityFilterChip
                value={selectedEntityId}
                selectedLabel={entityLabel}
                onChange={handleEntityChange}
                initialOptions={initialEntityOptions}
              />
              <PropertyFilterChip
                value={selectedPropertyId}
                selectedLabel={propertyLabel}
                entityId={selectedEntityId}
                onChange={handlePropertyChange}
              />
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <AddTemplateButton onClick={() => openCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <TemplatesTable
        rows={rows}
        onOpen={(row) => openTemplate(row)}
        onSync={syncTemplate}
        syncingId={syncingId}
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
