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
  NumberSearchTabBody,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
  type TableOptionsConfig,
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

  // The gutter "Menu" stays as the home of the CSV export/print landing this
  // weekend; until then it shows a placeholder so the gutter chrome is ready.
  const tableOptions = useMemo<TableOptionsConfig>(
    () => ({
      ariaLabel: "Table menu",
      tabs: [
        {
          key: "csv",
          label: "Export",
          render: () => (
            <p className="px-1 py-2 text-xs text-[var(--foreground)]/55">
              Pending CSV export
            </p>
          ),
        },
      ],
    }),
    [],
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
    <ListPageShell>
      <ListCreateButtonPortal label="Entity Type" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Entity Types"
        rowCount={rows.length}
        total={total}
        rowCountLabel="entity types"
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
          <NumberSearchTabBody
            value={entityTypeNumberValue}
            onChange={handleEntityTypeNumberChange}
            placeholder="ET #"
            ariaLabel="Search entity types by number"
          />
        </ToolbarMenuButton>
      </ListActionBar>

      <EntityTypesTable
        rows={rows}
        onOpenEntityType={(row) => openEntityType(row.id)}
        tableOptions={tableOptions}
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
