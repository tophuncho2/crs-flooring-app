"use client"

import { useCallback, useMemo } from "react"
import { DebouncedSearchControl, ListToolbar, ListToolbarBottomRow, ListToolbarCell, StateSearchControl, useFetchListController, LIST_FRESHNESS_STANDARD } from "@/engines/list-view"
import type { ListInput, PropertiesListFilters } from "@builders/application"
import {
  LIST_PROPERTIES_PAGE_SIZE,
  normalizeAddressState,
  type EntityOption,
  type PropertyListRow,
} from "@builders/domain"
import {
  PROPERTIES_LIST_QUERY_KEY,
  listPropertiesRequest,
} from "@/modules/properties/data/list-properties-request"
import { usePropertiesListController } from "@/modules/properties/controllers/use-properties-list-controller"
import { useRecordEntryNavigation } from "@/hooks/navigation/use-record-entry-navigation"
import { useRouter } from "next/navigation"
import { buildPropertyRecordHref, buildRecordCreateHref } from "@/hooks/navigation/routes"
import { PropertiesTable } from "./properties-table"
import { AddHubButton } from "./toolbar-controls/add-hub-button"
import { EntityFilterChip } from "./toolbar-controls/entity-filter-chip"
import { PropertiesListSearch } from "./toolbar-controls/properties-list-search"
import { PropertiesClearAll } from "./toolbar-controls/sub-controls/properties-clear-all"
import { PropertiesRowCount } from "./toolbar-controls/sub-controls/properties-row-count"

const PROPERTIES_FILTERABLE_FIELDS = ["propNumber", "entityId", "state"] as const

// The list-view engine stores every filter value as `string[]`. The app filter
// type carries scalars (`propNumber`) alongside arrays, so we bridge the two
// the same way inventory does: an all-array engine view + adapters at the edge.
type EnginePropertiesFilters = {
  propNumber?: ReadonlyArray<string>
  entityId?: ReadonlyArray<string>
  state?: ReadonlyArray<string>
}

function toEngineFilters(app: PropertiesListFilters): EnginePropertiesFilters {
  const out: EnginePropertiesFilters = {}
  if (app.propNumber && app.propNumber.length > 0) out.propNumber = [app.propNumber]
  if (app.entityId?.length) out.entityId = app.entityId
  if (app.state?.length) out.state = app.state
  return out
}

function toAppFilters(engine: EnginePropertiesFilters): PropertiesListFilters {
  const out: PropertiesListFilters = {}
  const propNumber = engine.propNumber?.[0]?.trim()
  if (propNumber) out.propNumber = propNumber
  if (engine.entityId?.length) out.entityId = engine.entityId
  if (engine.state?.length) out.state = engine.state
  return out
}

export type PropertiesClientProps = {
  initialSearchQuery: string
  initialPage: number
  initialFilters: PropertiesListFilters
  initialEntityOptions: EntityOption[]
  initialSelectedEntity?: EntityOption | null
}

export default function PropertiesClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialEntityOptions,
  initialSelectedEntity = null,
}: PropertiesClientProps) {
  const { message, pageError } = usePropertiesListController()
  const router = useRouter()

  // Convert the engine's all-array filters back to the app shape before fetch.
  const adaptedListFn = useCallback(
    (input: ListInput<EnginePropertiesFilters>) =>
      listPropertiesRequest({
        ...input,
        filters: input.filters ? toAppFilters(input.filters) : undefined,
      }),
    [],
  )
  // Properties have no record page of their own — a row opens its management
  // company's record view drilled into the property (or the entity create flow when
  // the property has no entity). `returnTo` brings the user back to this list.
  const { returnTo } = useRecordEntryNavigation("/dashboard/properties")

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
  } = useFetchListController<PropertyListRow, EnginePropertiesFilters>({
    mode: "fetch",
    queryKey: [...PROPERTIES_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_PROPERTIES_PAGE_SIZE,
    tableKey: "properties-main",
    filterableFields: PROPERTIES_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const propNumberValue = filters.propNumber?.[0] ?? ""

  const handlePropNumberChange = useCallback(
    (next: string) => {
      const trimmed = next.trim()
      onFilterChange("propNumber", trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const selectedEntityId = filters.entityId?.[0] ?? null

  const selectedEntityLabel = useMemo(() => {
    if (!selectedEntityId) return null
    if (initialSelectedEntity?.id === selectedEntityId) {
      return initialSelectedEntity.entity
    }
    return (
      initialEntityOptions.find(
        (option) => option.id === selectedEntityId,
      )?.entity ?? null
    )
  }, [
    selectedEntityId,
    initialSelectedEntity,
    initialEntityOptions,
  ])

  const handleEntityChange = useCallback(
    (id: string | null) => {
      onFilterChange("entityId", id ? [id] : [])
    },
    [onFilterChange],
  )

  const selectedState = filters.state?.[0] ?? null

  const handleStateChange = useCallback(
    (next: string | null) => {
      const normalized = next ? normalizeAddressState(next) : ""
      onFilterChange("state", normalized.length === 2 ? [normalized] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (propNumberValue.trim().length > 0) return true
    if (selectedEntityId) return true
    if (selectedState) return true
    return false
  }, [searchQuery, propNumberValue, selectedEntityId, selectedState])

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
              Properties
            </span>
          </div>
          <ListToolbar className="pt-0" showDivider={false}>
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <PropertiesListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <DebouncedSearchControl
                  value={propNumberValue}
                  onCommit={handlePropNumberChange}
                  placeholder="PROP #"
                  ariaLabel="Search properties by property number"
                />
                <StateSearchControl
                  value={selectedState}
                  onChange={handleStateChange}
                  ariaLabel="Filter properties by state"
                />
                <ListToolbarBottomRow
                  left={<PropertiesClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<PropertiesRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            <ListToolbarCell>
              <EntityFilterChip
                value={selectedEntityId}
                selectedLabel={selectedEntityLabel}
                onChange={handleEntityChange}
                initialOptions={initialEntityOptions}
              />
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

      <PropertiesTable
        rows={rows}
        onOpenProperty={(row) =>
          router.push(buildPropertyRecordHref(row.id, row.entity?.id ?? null, returnTo))
        }
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
