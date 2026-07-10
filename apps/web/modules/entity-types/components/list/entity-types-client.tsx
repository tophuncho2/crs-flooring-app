"use client"

import { useCallback, useMemo } from "react"
import { Search } from "lucide-react"
import {
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ListPageFeedback,
  ToolbarMenuButton,
  SearchControl,
  DebouncedSearchControl,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import type { ListInput, EntityTypesListFilters } from "@builders/application"
import {
  LIST_ENTITY_TYPES_PAGE_SIZE,
  type EntityTypeListRow,
} from "@builders/domain"
import {
  ENTITY_TYPES_LIST_QUERY_KEY,
  listEntityTypesRequest,
} from "@/modules/entity-types/data/list-entity-types-request"
import { useEntityTypesListController } from "@/modules/entity-types/controllers/list/use-entity-types-list-controller"
import { EntityTypesTable } from "./entity-types-table"

// The engine's filter map carries `string[]` only — wrap the scalar ET-number
// search in a 1-element array, mirroring the job-type / warehouse number bars.
type EngineEntityTypeFilters = {
  entityTypeNumber?: ReadonlyArray<string>
}

const ENTITY_TYPES_FILTERABLE_FIELDS = ["entityTypeNumber"] as const

function toEngineFilters(app: EntityTypesListFilters): EngineEntityTypeFilters {
  return app.entityTypeNumber ? { entityTypeNumber: [app.entityTypeNumber] } : {}
}

function toAppFilters(engine: EngineEntityTypeFilters): EntityTypesListFilters {
  const entityTypeNumber = engine.entityTypeNumber?.[0]?.trim()
  return entityTypeNumber ? { entityTypeNumber } : {}
}

export type EntityTypesClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: EntityTypesListFilters
}

export default function EntityTypesClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
}: EntityTypesClientProps) {
  const { message, pageError, openCreate, openEntityType } = useEntityTypesListController()

  // The engine's filter map carries `string[]` only — translate to the typed
  // scalar `EntityTypesListFilters` at the listFn boundary.
  const adaptedListFn = useCallback(
    (input: ListInput<EngineEntityTypeFilters>) =>
      listEntityTypesRequest({
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
    columnWidths,
    onColumnWidthsChange,
  } = useFetchListController<EntityTypeListRow, EngineEntityTypeFilters>({
    mode: "fetch",
    queryKey: [...ENTITY_TYPES_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_ENTITY_TYPES_PAGE_SIZE,
    tableKey: "entity-types-main",
    filterableFields: ENTITY_TYPES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const entityTypeNumberValue = filters.entityTypeNumber?.[0] ?? ""

  const handleEntityTypeNumberChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("entityTypeNumber", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(
    () => searchQuery.trim().length > 0 || entityTypeNumberValue.trim().length > 0,
    [searchQuery, entityTypeNumberValue],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <ListPageShell fill>
      <ListCreateButtonPortal label="Entity Type" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Entity Types"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={searchQuery.trim().length > 0 || entityTypeNumberValue.trim().length > 0}
        >
          <SearchControl
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
            placeholder="Search entity types"
          />
          <DebouncedSearchControl
            value={entityTypeNumberValue}
            onCommit={handleEntityTypeNumberChange}
            placeholder="ET #"
            ariaLabel="Search entity types by number"
          />
        </ToolbarMenuButton>
      </ListActionBar>

      <EntityTypesTable
        rows={rows}
        onOpenEntityType={(row) => openEntityType(row.id)}
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
