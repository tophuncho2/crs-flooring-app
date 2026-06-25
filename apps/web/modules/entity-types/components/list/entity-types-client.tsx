"use client"

import { useCallback, useMemo } from "react"
import {
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
  NumberSearchTabBody,
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
import { AddEntityTypeButton } from "./toolbar-controls/add-entity-type-button"
import { EntityTypesListSearch } from "./toolbar-controls/entity-types-list-search"
import { EntityTypesClearAll } from "./toolbar-controls/sub-controls/entity-types-clear-all"
import { EntityTypesRowCount } from "./toolbar-controls/sub-controls/entity-types-row-count"

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

  // Row-number search lives in the table's gutter "Menu" (a single "ET #" tab)
  // rather than the toolbar, mirroring the inventory list. Auto-commits on
  // debounce, so the menu stays open; the tab lights when a value is present.
  const tableOptions = useMemo<TableOptionsConfig>(
    () => ({
      tabs: [
        {
          key: "number",
          label: "ET #",
          active: entityTypeNumberValue.trim().length > 0,
          render: () => (
            <NumberSearchTabBody
              value={entityTypeNumberValue}
              onChange={handleEntityTypeNumberChange}
              placeholder="ET #"
              ariaLabel="Search entity types by number"
            />
          ),
        },
      ],
    }),
    [entityTypeNumberValue, handleEntityTypeNumberChange],
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
              Entity Types
            </span>
          </div>
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <EntityTypesListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <ListToolbarBottomRow
                  left={
                    <EntityTypesClearAll
                      hasActive={hasActiveFilters}
                      onClick={handleClearAll}
                    />
                  }
                  right={<EntityTypesRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <AddEntityTypeButton onClick={() => openCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

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
    </div>
  )
}
