"use client"

import { useCallback, useMemo } from "react"
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react"
import {
  DebouncedSearchControl,
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ListPageFeedback,
  SortMenuBody,
  ToolbarMenuButton,
  SearchControl,
  StateSearchControl,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import type { EntitiesListFilters, ListInput } from "@builders/application"
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
import {
  ENTITIES_ALLOWED_SORT_FIELDS,
  ENTITIES_MAX_SORT_LEVELS,
  ENTITIES_SORT_OPTIONS,
} from "./table/entities-list-columns"

const ENTITIES_FILTERABLE_FIELDS = ["entityNumber", "state", "entityTypeIds"] as const

// The list-view engine stores every filter value as `string[]`. The app filter
// type carries a scalar `entityNumber` alongside arrays, so we bridge the two the
// same way properties does: an all-array engine view + adapters at the edge.
type EngineEntitiesFilters = {
  entityNumber?: ReadonlyArray<string>
  state?: ReadonlyArray<string>
  entityTypeIds?: ReadonlyArray<string>
}

function toEngineFilters(app: EntitiesListFilters): EngineEntitiesFilters {
  const out: EngineEntitiesFilters = {}
  if (app.entityNumber && app.entityNumber.length > 0) out.entityNumber = [app.entityNumber]
  if (app.state?.length) out.state = app.state
  if (app.entityTypeIds?.length) out.entityTypeIds = app.entityTypeIds
  return out
}

function toAppFilters(engine: EngineEntitiesFilters): EntitiesListFilters {
  const out: EntitiesListFilters = {}
  const entityNumber = engine.entityNumber?.[0]?.trim()
  if (entityNumber) out.entityNumber = entityNumber
  if (engine.state?.length) out.state = engine.state
  if (engine.entityTypeIds?.length) out.entityTypeIds = engine.entityTypeIds
  return out
}

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

  // Convert the engine's all-array filters back to the app shape before fetch.
  const adaptedListFn = useCallback(
    (input: ListInput<EngineEntitiesFilters>) =>
      listEntitiesRequest({
        ...input,
        filters: input.filters ? toAppFilters(input.filters) : undefined,
      }),
    [],
  )

  const {
    rows,
    total,
    searchQuery,
    filters,
    sorts,
    hasNonDefaultSort,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSearchQueryChange,
    onSortsChange,
    onFilterChange,
    onClearAllFilters,
    columnWidths,
    onColumnWidthsChange,
  } = useFetchListController<EntityListRow, EngineEntitiesFilters>({
    mode: "fetch",
    queryKey: [...ENTITIES_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialSort: { field: "entity", direction: "asc" },
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_ENTITIES_PAGE_SIZE,
    tableKey: "entities-main",
    filterableFields: ENTITIES_FILTERABLE_FIELDS,
    allowedSortFields: ENTITIES_ALLOWED_SORT_FIELDS,
    maxSortLevels: ENTITIES_MAX_SORT_LEVELS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const entityNumberValue = filters.entityNumber?.[0] ?? ""

  const handleEntityNumberChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("entityNumber", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const selectedState = filters.state?.[0] ?? null

  const selectedTypeIds = useMemo(
    () => [...(filters.entityTypeIds ?? [])],
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

  const hasActiveSortTool = hasNonDefaultSort

  // Each tool lights its own dot independently; `hasActiveFilters` stays the
  // ListActionBar clear-all signal. Filter = entity types; Search = free-text +
  // the state-code bar (a search-style input, so it lives in the Search menu).
  const hasActiveFilterTool = useMemo(
    () => selectedTypeIds.length > 0,
    [selectedTypeIds],
  )

  const hasActiveSearchTool = useMemo(
    () =>
      searchQuery.trim().length > 0 ||
      entityNumberValue.trim().length > 0 ||
      Boolean(selectedState),
    [searchQuery, entityNumberValue, selectedState],
  )

  const hasActiveFilters = hasActiveFilterTool || hasActiveSearchTool || hasActiveSortTool

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <ListPageShell fill>
      <ListCreateButtonPortal label="Entity" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Entities"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        {/* Sort — the multi-column builder, leftmost. The only sort affordance. */}
        <ToolbarMenuButton
          label="Sort"
          title="Sort by"
          icon={ArrowUpDown}
          active={hasActiveSortTool}
          bodyClassName="w-auto"
        >
          <SortMenuBody
            options={ENTITIES_SORT_OPTIONS}
            value={sorts}
            maxLevels={ENTITIES_MAX_SORT_LEVELS}
            onChange={onSortsChange}
          />
        </ToolbarMenuButton>

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

        {/* Search — free-text bar + the ENT # exact-number bar + the state-code
            bar (all search-style inputs; mirrors properties). */}
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
          <DebouncedSearchControl
            value={entityNumberValue}
            onCommit={handleEntityNumberChange}
            placeholder="ENT #"
            ariaLabel="Search entities by entity number"
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
        columnWidths={columnWidths}
        onColumnWidthsChange={onColumnWidthsChange}
      />
    </ListPageShell>
  )
}
