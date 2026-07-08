"use client"

import { useCallback, useMemo } from "react"
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react"
import {
  DebouncedSearchControl,
  SearchControl,
  SortMenuBody,
  StateSearchControl,
  ListActionBar,
  ListCreateButtonPortal,
  ListPageShell,
  ListPageFeedback,
  ToolbarMenuButton,
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import { FilterPickerChip, usePickedOptionLabel } from "@/engines/picker"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
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
import {
  PROPERTIES_ALLOWED_SORT_FIELDS,
  PROPERTIES_MAX_SORT_LEVELS,
  PROPERTIES_SORT_OPTIONS,
} from "./table/properties-list-columns"

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
  } = useFetchListController<PropertyListRow, EnginePropertiesFilters>({
    mode: "fetch",
    queryKey: [...PROPERTIES_LIST_QUERY_KEY],
    listFn: adaptedListFn,
    initialSearchQuery,
    initialSort: { field: "name", direction: "asc" },
    initialPage,
    initialFilters: toEngineFilters(initialFilters),
    pageSize: LIST_PROPERTIES_PAGE_SIZE,
    tableKey: "properties-main",
    filterableFields: PROPERTIES_FILTERABLE_FIELDS,
    allowedSortFields: PROPERTIES_ALLOWED_SORT_FIELDS,
    maxSortLevels: PROPERTIES_MAX_SORT_LEVELS,
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

  const entityFilter = usePickedOptionLabel<EntityOption>(
    selectedEntityId,
    selectedEntityLabel,
    (option) => option.entity,
  )

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

  const hasActiveSortTool = hasNonDefaultSort

  const hasActiveFilterTool = useMemo(
    () => Boolean(selectedEntityId) || Boolean(selectedState),
    [selectedEntityId, selectedState],
  )

  const hasActiveSearchTool = useMemo(
    () => searchQuery.trim().length > 0 || propNumberValue.trim().length > 0,
    [searchQuery, propNumberValue],
  )

  const hasActiveFilters = useMemo(
    () => hasActiveFilterTool || hasActiveSearchTool || hasActiveSortTool,
    [hasActiveFilterTool, hasActiveSearchTool, hasActiveSortTool],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <ListPageShell fill>
      <ListCreateButtonPortal
        label="Property"
        onClick={() =>
          router.push(buildRecordCreateHref("/dashboard/entities", { returnTo }))
        }
      />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Properties"
        rowCount={rows.length}
        total={total}
        rowCountLabel="properties"
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
            options={PROPERTIES_SORT_OPTIONS}
            value={sorts}
            maxLevels={PROPERTIES_MAX_SORT_LEVELS}
            onChange={onSortsChange}
          />
        </ToolbarMenuButton>

        {/* Filter — the Entity picker + the state text filter, composed directly
            (NOT a self-triggering FilterControl). */}
        <ToolbarMenuButton
          label="Filter"
          icon={SlidersHorizontal}
          active={hasActiveFilterTool}
        >
          <FilterPickerChip<EntityOption>
            value={selectedEntityId}
            onChange={handleEntityChange}
            selectedLabel={entityFilter.selectedLabel}
            onOptionSelected={entityFilter.onOptionSelected}
            nounSingular="Entity"
            nounPlural="entities"
            subject="properties"
          >
            {(chrome) => (
              <EntityTypePicker {...chrome} initialOptions={initialEntityOptions} />
            )}
          </FilterPickerChip>
          <StateSearchControl
            value={selectedState}
            onChange={handleStateChange}
            ariaLabel="Filter properties by state"
          />
        </ToolbarMenuButton>

        {/* Search — full-text + PROP # exact number, mirrors products. */}
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={hasActiveSearchTool}
        >
          <SearchControl
            query={searchQuery}
            onQueryChange={onSearchQueryChange}
            placeholder="Search properties"
          />
          <DebouncedSearchControl
            value={propNumberValue}
            onCommit={handlePropNumberChange}
            placeholder="PROP #"
            ariaLabel="Search properties by property number"
          />
        </ToolbarMenuButton>
      </ListActionBar>

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
    </ListPageShell>
  )
}
