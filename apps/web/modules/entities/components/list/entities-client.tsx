"use client"

import { useCallback, useMemo } from "react"
import { ListToolbar, ListToolbarBottomRow, ListToolbarCell, StateSearchControl, useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import type { EntitiesListFilters } from "@builders/application"
import {
  LIST_ENTITIES_PAGE_SIZE,
  normalizeAddressState,
  type EntityListRow,
  type EntityTypeOption,
} from "@builders/domain"
import { EntityTypeMultiSelect } from "@/modules/entity-types/components/picker/entity-type-multi-select"
import {
  ENTITIES_LIST_QUERY_KEY,
  listEntitiesRequest,
} from "@/modules/entities/data/list-entities-request"
import { useEntitiesListController } from "@/modules/entities/controllers/list/use-entities-list-controller"
import { useRecordEntryNavigation } from "@/hooks/navigation/use-record-entry-navigation"
import { useRouter } from "next/navigation"
import { buildRecordCreateHref } from "@/hooks/navigation/routes"
import { EntitiesTable } from "./entities-table"
import { AddHubButton } from "./toolbar-controls/add-hub-button"
import { EntitiesListSearch } from "./toolbar-controls/entities-list-search"
import { EntitiesClearAll } from "./toolbar-controls/sub-controls/entities-clear-all"
import { EntitiesRowCount } from "./toolbar-controls/sub-controls/entities-row-count"

const ENTITIES_FILTERABLE_FIELDS = ["state", "entityTypeIds"] as const

export type EntitiesClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: EntitiesListFilters
  /** Seed refs ({id,type,color}) for any URL-restored entity-type filter chips. */
  initialEntityTypeRefs: EntityTypeOption[]
}

export default function EntitiesClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialEntityTypeRefs,
}: EntitiesClientProps) {
  const { message, pageError } = useEntitiesListController()
  const router = useRouter()
  const { openRecord: openEntity, returnTo } = useRecordEntryNavigation(
    "/dashboard/entities",
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
  } = useFetchListController<EntityListRow, EntitiesListFilters>({
    mode: "fetch",
    queryKey: [...ENTITIES_LIST_QUERY_KEY],
    listFn: listEntitiesRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: LIST_ENTITIES_PAGE_SIZE,
    tableKey: "entities-main",
    filterableFields: ENTITIES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const selectedState =
    (filters as EntitiesListFilters).state?.[0] ?? null

  const selectedTypeIds = useMemo(
    () => [...((filters as EntitiesListFilters).entityTypeIds ?? [])],
    [filters],
  )

  const handleStateChange = useCallback(
    (next: string | null) => {
      const normalized = next ? normalizeAddressState(next) : ""
      onFilterChange("state", normalized.length === 2 ? [normalized] : [])
    },
    [onFilterChange],
  )

  const handleTypeFilterChange = useCallback(
    (nextIds: string[]) => onFilterChange("entityTypeIds", nextIds),
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (selectedState) return true
    if (selectedTypeIds.length > 0) return true
    return false
  }, [searchQuery, selectedState, selectedTypeIds])

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
              Entities
            </span>
          </div>
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <EntitiesListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <StateSearchControl
                  value={selectedState}
                  onChange={handleStateChange}
                  ariaLabel="Filter entities by state"
                />
                <ListToolbarBottomRow
                  left={
                    <EntitiesClearAll
                      hasActive={hasActiveFilters}
                      onClick={handleClearAll}
                    />
                  }
                  right={<EntitiesRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            {/* Type filter — its own framed card to the right of the search
                card (not nested inside it). The multi-select's chips + "Add
                type" trigger live here so the picker is directly clickable. */}
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md border border-[var(--panel-border)] p-2">
                <span className="text-xs font-medium text-[var(--foreground)]/60">
                  Type
                </span>
                <EntityTypeMultiSelect
                  selectedIds={selectedTypeIds}
                  seedRefs={initialEntityTypeRefs}
                  editable
                  onChange={handleTypeFilterChange}
                />
              </div>
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <AddHubButton
                onClick={() =>
                  router.push(buildRecordCreateHref("/dashboard/entities", { returnTo }))
                }
              />
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <EntitiesTable
        rows={rows}
        onOpenEntity={(row) => openEntity(row.id)}
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
