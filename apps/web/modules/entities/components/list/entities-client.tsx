"use client"

import { useCallback, useMemo } from "react"
import { Search, SlidersHorizontal } from "lucide-react"
import {
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ListPageFeedback,
  ToolbarMenuButton,
  SearchControl,
  StateSearchControl,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import type { EntitiesListFilters } from "@builders/application"
import {
  LIST_ENTITIES_PAGE_SIZE,
  type EntityListRow,
} from "@builders/domain"
import { EntityTypeRail } from "@/modules/entity-types/components/picker/entity-type-rail"
import {
  ENTITIES_LIST_QUERY_KEY,
  listEntitiesRequest,
} from "@/modules/entities/data/list-entities-request"
import { useEntitiesListController } from "@/modules/entities/controllers/list/use-entities-list-controller"
import { EntitiesTable } from "./entities-table"

const ENTITIES_FILTERABLE_FIELDS = ["state", "entityTypeIds"] as const

export type EntitiesClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: EntitiesListFilters
}

export default function EntitiesClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
}: EntitiesClientProps) {
  const { message, pageError, openCreate, openEntity } = useEntitiesListController()

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
    (next: string | null) => onFilterChange("state", next ? [next] : []),
    [onFilterChange],
  )

  const handleTypeFilterChange = useCallback(
    (nextIds: string[]) => onFilterChange("entityTypeIds", nextIds),
    [onFilterChange],
  )

  // Each tool lights its own dot independently; `hasActiveFilters` stays the
  // ListActionBar clear-all signal. Filter = entity types; Search = free-text +
  // the state-code bar (a search-style input, so it lives in the Search menu).
  const hasActiveFilterTool = useMemo(
    () => selectedTypeIds.length > 0,
    [selectedTypeIds],
  )

  const hasActiveSearchTool = useMemo(
    () => searchQuery.trim().length > 0 || Boolean(selectedState),
    [searchQuery, selectedState],
  )

  const hasActiveFilters = hasActiveFilterTool || hasActiveSearchTool

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <ListPageShell>
      <ListCreateButtonPortal label="Entity" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Entities"
        rowCount={rows.length}
        total={total}
        rowCountLabel="entities"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        {/* Filter — the entity-type glow rail (same rail as the combo picker):
            every type listed, selected ones glow, click to toggle. */}
        <ToolbarMenuButton
          label="Filter"
          icon={SlidersHorizontal}
          active={hasActiveFilterTool}
          bodyClassName="w-[18rem]"
        >
          <div className="flex h-80 min-h-0 flex-col">
            <EntityTypeRail
              selectedIds={selectedTypeIds}
              onChange={handleTypeFilterChange}
            />
          </div>
        </ToolbarMenuButton>

        {/* Search — free-text bar + the state-code bar (both search-style
            inputs; entities have no number field). */}
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={hasActiveSearchTool}
        >
          <SearchControl
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
            placeholder="Search entity"
          />
          <StateSearchControl
            value={selectedState}
            onChange={handleStateChange}
            ariaLabel="Filter entities by state"
          />
        </ToolbarMenuButton>
      </ListActionBar>

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
    </ListPageShell>
  )
}
