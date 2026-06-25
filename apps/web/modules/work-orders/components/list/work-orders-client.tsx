"use client"

import { useCallback, useMemo } from "react"
import { DebouncedSearchControl, ListToolbar, ListToolbarBottomRow, ListToolbarCell, SortMenuBody, useFetchListController, LIST_FRESHNESS_STANDARD, type TableOptionsConfig } from "@/engines/list-view"
import type { WorkOrdersListFilters } from "@builders/application"
import type {
  JobTypeOption,
  EntityOption,
  PropertyOption,
  TemplateOption,
  WarehouseOption,
  WorkOrderListRow,
} from "@builders/domain"
import {
  WORK_ORDERS_LIST_FILTERABLE_FIELDS,
  WORK_ORDERS_LIST_PAGE_SIZE,
  WORK_ORDERS_LIST_QUERY_KEY,
  listWorkOrdersRequest,
} from "@/modules/work-orders/data/list-work-orders-request"
import { useWorkOrdersListController } from "@/modules/work-orders/controllers/list/use-work-orders-list-controller"
import { WorkOrdersTable } from "./work-orders-table"
import { AddWorkOrderButton } from "./toolbar-controls/add-work-order-button"
import { JobTypeFilterChip } from "./toolbar-controls/job-type-filter-chip"
import { EntityFilterChip } from "./toolbar-controls/entity-filter-chip"
import { PropertyFilterChip } from "./toolbar-controls/property-filter-chip"
import { ScheduledForFilterBody } from "./toolbar-controls/scheduled-for-filter-body"
import { WorkOrderNumberFilterBody } from "./toolbar-controls/work-order-number-filter-body"
import { TemplateFilterChip } from "./toolbar-controls/template-filter-chip"
import { VacancyFilterChip } from "./toolbar-controls/vacancy-filter-chip"
import { WarehouseFilterChip } from "./toolbar-controls/warehouse-filter-chip"
import { WorkOrdersClearAll } from "./toolbar-controls/sub-controls/work-orders-clear-all"
import { WorkOrdersRowCount } from "./toolbar-controls/sub-controls/work-orders-row-count"

const WORK_ORDERS_ALLOWED_SORT_FIELDS = [
  "createdAt",
  "scheduledFor",
  "property",
  "entity",
] as const

/** Max simultaneous sort columns surfaced by the toolbar Sort menu. */
const WORK_ORDERS_MAX_SORT_LEVELS = 3

// Columns offered by the Sort menu — keyed by backend sort field (what lands in
// `sorts`), labelled to match the table headers.
const WORK_ORDERS_SORT_OPTIONS = [
  { key: "scheduledFor", label: "Date" },
  { key: "entity", label: "Entity" },
  { key: "property", label: "Property" },
  { key: "createdAt", label: "Created" },
] as const

// Sortable DataTable column key ⇄ backend sort field (buildWorkOrdersOrderBy).
// Two keys diverge from their backend field because the column key mirrors the
// `WorkOrderListRow` field that `renderWorkOrderRowCell` switches on.
const SORT_FIELD_BY_COLUMN: Record<string, string> = {
  scheduledFor: "scheduledFor",
  entityName: "entity",
  propertyName: "property",
  createdAt: "createdAt",
}
const COLUMN_BY_SORT_FIELD: Record<string, string> = {
  scheduledFor: "scheduledFor",
  entity: "entityName",
  property: "propertyName",
  createdAt: "createdAt",
}

function defaultSortDirection(field: string): "asc" | "desc" {
  // Name columns read A–Z by default; date columns newest/latest first.
  return field === "property" || field === "entity" ? "asc" : "desc"
}

export default function WorkOrdersClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialEntityOptions,
  initialSelectedEntity = null,
  initialPropertyOptions,
  initialSelectedProperty = null,
  initialTemplateOptions,
  initialSelectedTemplate = null,
  initialWarehouseOptions,
  initialSelectedWarehouse = null,
  initialJobTypeOptions,
  initialSelectedJobType = null,
}: {
  initialSearchQuery: string
  initialPage: number
  initialFilters: WorkOrdersListFilters
  initialEntityOptions: EntityOption[]
  initialSelectedEntity?: EntityOption | null
  initialPropertyOptions: PropertyOption[]
  initialSelectedProperty?: PropertyOption | null
  initialTemplateOptions: TemplateOption[]
  initialSelectedTemplate?: TemplateOption | null
  initialWarehouseOptions: WarehouseOption[]
  initialSelectedWarehouse?: WarehouseOption | null
  initialJobTypeOptions: JobTypeOption[]
  initialSelectedJobType?: JobTypeOption | null
}) {
  const { message, pageError, openCreate, openWorkOrder } = useWorkOrdersListController()

  const {
    rows,
    total,
    filters,
    sort,
    sorts,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSortChange,
    onToggleSortDirection,
    onSortsChange,
    onFilterChange,
    onClearAllFilters,
  } = useFetchListController<WorkOrderListRow, WorkOrdersListFilters>({
    mode: "fetch",
    queryKey: [...WORK_ORDERS_LIST_QUERY_KEY],
    listFn: listWorkOrdersRequest,
    initialSearchQuery,
    initialSort: { field: "createdAt", direction: "desc" },
    initialPage,
    initialFilters,
    pageSize: WORK_ORDERS_LIST_PAGE_SIZE,
    tableKey: "work-orders-main",
    allowedSortFields: WORK_ORDERS_ALLOWED_SORT_FIELDS,
    maxSortLevels: WORK_ORDERS_MAX_SORT_LEVELS,
    filterableFields: WORK_ORDERS_LIST_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  // --- Selected values from the filter map ---
  const selectedEntityId = filters.entityId?.[0] ?? null
  const selectedPropertyId = filters.propertyId?.[0] ?? null
  const selectedTemplateId = filters.templateId?.[0] ?? null
  const selectedWarehouseId = filters.warehouseId?.[0] ?? null
  const selectedJobTypeId = filters.jobTypeId?.[0] ?? null
  const selectedVacancy = filters.vacancy?.[0] ?? null
  const selectedScheduledStart = filters.scheduledForStart?.[0] ?? null
  const selectedScheduledEnd = filters.scheduledForEnd?.[0] ?? null

  // --- Column-header sort (DataTable) ---
  // Header click maps the column key to its backend sort field, then flips
  // direction when already active or selects a sensible default otherwise.
  const handleSort = useCallback(
    (key: string) => {
      const field = SORT_FIELD_BY_COLUMN[key]
      if (!field) return
      if (sort?.field === field) onToggleSortDirection()
      else onSortChange({ field, direction: defaultSortDirection(field) })
    },
    [sort, onSortChange, onToggleSortDirection],
  )
  // Reflect each active backend field back onto its column key so the right
  // header carets light up (with priority badges when more than one is active).
  const tableSorts = useMemo(
    () =>
      sorts.map((entry) => ({
        field: COLUMN_BY_SORT_FIELD[entry.field] ?? entry.field,
        direction: entry.direction,
      })),
    [sorts],
  )

  // --- Per-column identity search bars ---
  const unitTypeValue = filters.unitType?.[0] ?? ""
  const unitNumberValue = filters.unitNumber?.[0] ?? ""
  const workOrderNumberValue = filters.workOrderNumber?.[0] ?? ""
  const descriptionValue = filters.description?.[0] ?? ""

  // --- Selected-label snapshots (initial-seed + fallback to current options) ---
  const entityLabel = useMemo(() => {
    if (!selectedEntityId) return null
    if (initialSelectedEntity?.id === selectedEntityId) return initialSelectedEntity.entity
    return initialEntityOptions.find((o) => o.id === selectedEntityId)?.entity ?? null
  }, [selectedEntityId, initialSelectedEntity, initialEntityOptions])

  const propertyLabel = useMemo(() => {
    if (!selectedPropertyId) return null
    if (initialSelectedProperty?.id === selectedPropertyId) return initialSelectedProperty.name
    return initialPropertyOptions.find((o) => o.id === selectedPropertyId)?.name ?? null
  }, [selectedPropertyId, initialSelectedProperty, initialPropertyOptions])

  const templateLabel = useMemo(() => {
    if (!selectedTemplateId) return null
    if (initialSelectedTemplate?.id === selectedTemplateId) {
      return initialSelectedTemplate.unitType || null
    }
    const match = initialTemplateOptions.find((o) => o.id === selectedTemplateId)
    return match ? match.unitType || null : null
  }, [selectedTemplateId, initialSelectedTemplate, initialTemplateOptions])

  const warehouseLabel = useMemo(() => {
    if (!selectedWarehouseId) return null
    if (initialSelectedWarehouse?.id === selectedWarehouseId) return initialSelectedWarehouse.name
    return initialWarehouseOptions.find((o) => o.id === selectedWarehouseId)?.name ?? null
  }, [selectedWarehouseId, initialSelectedWarehouse, initialWarehouseOptions])

  const jobTypeLabel = useMemo(() => {
    if (!selectedJobTypeId) return null
    if (initialSelectedJobType?.id === selectedJobTypeId) return initialSelectedJobType.name
    return initialJobTypeOptions.find((o) => o.id === selectedJobTypeId)?.name ?? null
  }, [selectedJobTypeId, initialSelectedJobType, initialJobTypeOptions])

  // --- Cascade-clear handlers ---
  // Entity change → clear Property + Template (property-scoped chain).
  // Property change → clear Template (template is property-scoped).

  const handleTextFilterChange = useCallback(
    (
      key: "unitType" | "unitNumber" | "workOrderNumber" | "description",
      next: string,
    ) => {
      const trimmed = next.trim()
      onFilterChange(key, trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const handleEntityChange = useCallback(
    (id: string | null) => {
      onFilterChange("entityId", id ? [id] : [])
      onFilterChange("propertyId", [])
      onFilterChange("templateId", [])
    },
    [onFilterChange],
  )

  const handlePropertyChange = useCallback(
    (id: string | null) => {
      onFilterChange("propertyId", id ? [id] : [])
      onFilterChange("templateId", [])
    },
    [onFilterChange],
  )

  const handleTemplateChange = useCallback(
    (id: string | null) => {
      onFilterChange("templateId", id ? [id] : [])
    },
    [onFilterChange],
  )

  const handleWarehouseChange = useCallback(
    (id: string | null) => {
      onFilterChange("warehouseId", id ? [id] : [])
    },
    [onFilterChange],
  )

  const handleJobTypeChange = useCallback(
    (id: string | null) => {
      onFilterChange("jobTypeId", id ? [id] : [])
    },
    [onFilterChange],
  )

  const handleVacancyChange = useCallback(
    (value: string | null) => {
      onFilterChange("vacancy", value ? [value] : [])
    },
    [onFilterChange],
  )

  const handleScheduledForChange = useCallback(
    (start: string | null, end: string | null) => {
      onFilterChange("scheduledForStart", start ? [start] : [])
      onFilterChange("scheduledForEnd", end ? [end] : [])
    },
    [onFilterChange],
  )

  // Table-level controls live in the table's gutter TableOptions menu: the
  // "Sort" tab wraps the multi-column sort builder, the "WO #" tab hosts the
  // work-order row-number search (relocated off the toolbar), and the "Date" tab
  // hosts the scheduled-for range filter (moved off the Date column header funnel
  // — the toolbar chip was already retired). Single-column sort stays a header caret.
  const tableOptions = useMemo<TableOptionsConfig>(
    () => ({
      tabs: [
        {
          key: "sort",
          label: "Sort",
          active: sorts.length > 0,
          render: () => (
            <SortMenuBody
              options={WORK_ORDERS_SORT_OPTIONS}
              value={sorts}
              maxLevels={WORK_ORDERS_MAX_SORT_LEVELS}
              onChange={onSortsChange}
            />
          ),
        },
        {
          key: "workOrderNumber",
          label: "WO #",
          active: Boolean(workOrderNumberValue),
          render: () => (
            <WorkOrderNumberFilterBody
              value={workOrderNumberValue}
              onChange={(next) => handleTextFilterChange("workOrderNumber", next)}
            />
          ),
        },
        {
          key: "date",
          label: "Date",
          active: Boolean(selectedScheduledStart || selectedScheduledEnd),
          render: () => (
            <ScheduledForFilterBody
              start={selectedScheduledStart}
              end={selectedScheduledEnd}
              onChange={handleScheduledForChange}
            />
          ),
        },
      ],
    }),
    [
      sorts,
      onSortsChange,
      workOrderNumberValue,
      handleTextFilterChange,
      selectedScheduledStart,
      selectedScheduledEnd,
      handleScheduledForChange,
    ],
  )

  const hasActiveFilters = useMemo(() => {
    if (
      unitTypeValue ||
      unitNumberValue ||
      workOrderNumberValue ||
      descriptionValue
    ) {
      return true
    }
    if (
      selectedEntityId ||
      selectedPropertyId ||
      selectedTemplateId ||
      selectedWarehouseId ||
      selectedJobTypeId ||
      selectedVacancy ||
      selectedScheduledStart ||
      selectedScheduledEnd
    ) {
      return true
    }
    return false
  }, [
    unitTypeValue,
    unitNumberValue,
    workOrderNumberValue,
    descriptionValue,
    selectedEntityId,
    selectedPropertyId,
    selectedTemplateId,
    selectedWarehouseId,
    selectedJobTypeId,
    selectedVacancy,
    selectedScheduledStart,
    selectedScheduledEnd,
  ])

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
  }, [onClearAllFilters])

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
              Work Orders
            </span>
          </div>
          {/* pt-0 overrides ListToolbar's pt-4 so the tab's bottom edge meets
              the encased card's top edge (rounded-tl-none seam). */}
          <ListToolbar className="pt-0" showDivider={false}>
            {/* Per-column search bars + (Clear all | row count) — encased card
                attached to the tab above. Unit type / Unit # / Description each
                filter their own column (case-insensitive ILIKE). WO # row-number
                search lives in the table's gutter TableOptions menu ("WO #" tab). */}
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <DebouncedSearchControl
                  value={unitTypeValue}
                  onCommit={(next) => handleTextFilterChange("unitType", next)}
                  placeholder="Unit type"
                  ariaLabel="Search work orders by unit type"
                />
                <DebouncedSearchControl
                  value={unitNumberValue}
                  onCommit={(next) => handleTextFilterChange("unitNumber", next)}
                  placeholder="Unit #"
                  ariaLabel="Search work orders by unit number"
                />
                <DebouncedSearchControl
                  value={descriptionValue}
                  onCommit={(next) => handleTextFilterChange("description", next)}
                  placeholder="Description"
                  ariaLabel="Search work orders by description"
                />
                <ListToolbarBottomRow
                  left={<WorkOrdersClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<WorkOrdersRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            {/* One encased card: Entity → Property → Template stacked together.
                Property is entity-scoped and Template is property-scoped — a
                entity change cascades the property + template chip clears
                (handleEntityChange); a property change cascades the template
                clear (handlePropertyChange). */}
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md border border-[var(--panel-border)] p-2">
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
                  initialOptions={initialPropertyOptions}
                />
                <TemplateFilterChip
                  value={selectedTemplateId}
                  selectedLabel={templateLabel}
                  propertyId={selectedPropertyId}
                  entityId={selectedEntityId}
                  onChange={handleTemplateChange}
                  initialOptions={initialTemplateOptions}
                />
              </div>
            </ListToolbarCell>

            {/* One encased card: Warehouse + Job Type + Vacancy stacked together.
                All independent, non-cascading single-selects. Vacancy is a static
                two-option enum dropdown (off when nothing is selected). */}
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md border border-[var(--panel-border)] p-2">
                <WarehouseFilterChip
                  value={selectedWarehouseId}
                  selectedLabel={warehouseLabel}
                  onChange={handleWarehouseChange}
                  initialOptions={initialWarehouseOptions}
                />
                <JobTypeFilterChip
                  value={selectedJobTypeId}
                  selectedLabel={jobTypeLabel}
                  onChange={handleJobTypeChange}
                  initialOptions={initialJobTypeOptions}
                />
                <VacancyFilterChip
                  value={selectedVacancy}
                  onChange={handleVacancyChange}
                />
              </div>
            </ListToolbarCell>

            {/* Scheduled-for date filter + multi-column sort both live in the
                table's gutter TableOptions menu ("Date" and "Sort" tabs).
                Single-column sort stays a header-caret click. */}
            <ListToolbarCell className="ml-auto">
              <AddWorkOrderButton onClick={() => openCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>
      </div>

      <WorkOrdersTable
        rows={rows}
        onOpenWorkOrder={openWorkOrder}
        sorts={tableSorts}
        onSort={handleSort}
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
