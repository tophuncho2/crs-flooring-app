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
  useFetchListController,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
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
import {
  TEMPLATES_ALLOWED_SORT_FIELDS,
  TEMPLATES_MAX_SORT_LEVELS,
  TEMPLATES_SORT_OPTIONS,
} from "./table/templates-list-columns"
import { EntityFilterChip } from "./toolbar-controls/entity-filter-chip"
import { PropertyFilterChip } from "./toolbar-controls/property-filter-chip"

const TEMPLATES_FILTERABLE_FIELDS = [
  "entityId",
  "propertyId",
  "unitType",
  "description",
] as const

export default function TemplatesClient({
  initialPage,
  initialFilters,
  initialEntityOptions,
  initialSelectedEntity = null,
  initialSelectedProperty = null,
}: {
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
    filters,
    sorts,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSortsChange,
    onFilterChange,
    onClearAllFilters,
  } = useFetchListController<TemplateListRow, TemplatesListFilters>({
    mode: "fetch",
    queryKey: [...TEMPLATES_LIST_QUERY_KEY],
    listFn: listTemplatesRequest,
    initialSort: { field: "property", direction: "asc" },
    initialPage,
    initialFilters,
    pageSize: LIST_TEMPLATES_PAGE_SIZE,
    tableKey: "templates-main",
    filterableFields: TEMPLATES_FILTERABLE_FIELDS,
    allowedSortFields: TEMPLATES_ALLOWED_SORT_FIELDS,
    maxSortLevels: TEMPLATES_MAX_SORT_LEVELS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  const filtersTyped = filters as TemplatesListFilters
  const selectedEntityId = filtersTyped.entityId?.[0] ?? null
  const selectedPropertyId = filtersTyped.propertyId?.[0] ?? null
  const unitTypeValue = filtersTyped.unitType?.[0] ?? ""
  const descriptionValue = filtersTyped.description?.[0] ?? ""

  // Per-field text search bars — encode the scalar input as a single-element
  // filter array (empty → cleared). Mirrors the entity/property chips.
  const handleTextFilterChange = useCallback(
    (field: "unitType" | "description", next: string) => {
      const trimmed = next.trim()
      onFilterChange(field, trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

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

  const hasActiveSortTool = sorts.length > 0

  const hasActiveFilterTool = useMemo(
    () => Boolean(selectedEntityId) || Boolean(selectedPropertyId),
    [selectedEntityId, selectedPropertyId],
  )

  const hasActiveSearchTool = useMemo(
    () => unitTypeValue.length > 0 || descriptionValue.length > 0,
    [unitTypeValue, descriptionValue],
  )

  const hasActiveFilters = useMemo(
    () => hasActiveFilterTool || hasActiveSearchTool,
    [hasActiveFilterTool, hasActiveSearchTool],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
  }, [onClearAllFilters])

  return (
    <ListPageShell>
      <ListCreateButtonPortal label="Template" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Templates"
        rowCount={rows.length}
        total={total}
        rowCountLabel="templates"
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
            options={TEMPLATES_SORT_OPTIONS}
            value={sorts}
            maxLevels={TEMPLATES_MAX_SORT_LEVELS}
            onChange={onSortsChange}
          />
        </ToolbarMenuButton>

        {/* Filter — Entity → Property: property is entity-scoped (entity change
            cascades the property chip clear via handleEntityChange). Composed
            directly (NOT a self-triggering FilterControl). */}
        <ToolbarMenuButton
          label="Filter"
          icon={SlidersHorizontal}
          active={hasActiveFilterTool}
        >
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
        </ToolbarMenuButton>

        {/* Search — the per-field text bars (unit type + description). */}
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={hasActiveSearchTool}
        >
          <DebouncedSearchControl
            value={unitTypeValue}
            onCommit={(next) => handleTextFilterChange("unitType", next)}
            placeholder="Unit type"
            ariaLabel="Search templates by unit type"
          />
          <DebouncedSearchControl
            value={descriptionValue}
            onCommit={(next) => handleTextFilterChange("description", next)}
            placeholder="Description"
            ariaLabel="Search templates by description"
          />
        </ToolbarMenuButton>
      </ListActionBar>

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
    </ListPageShell>
  )
}
