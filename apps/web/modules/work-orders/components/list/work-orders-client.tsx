"use client"

import { useCallback, useMemo } from "react"
import { PaginateControls } from "@/components/features/paginate"
import {
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
} from "@/components/features/list-toolbar"
import { useFetchListController } from "@/controllers/list-view"
import { LIST_FRESHNESS_STANDARD } from "@/query-policies"
import type { WorkOrdersListFilters } from "@builders/application"
import type {
  ManagementCompanyOption,
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
import { MgmtCoFilterChip } from "./toolbar-controls/mgmt-co-filter-chip"
import { PropertyFilterChip } from "./toolbar-controls/property-filter-chip"
import { ScheduledForFilterChip } from "./toolbar-controls/scheduled-for-filter-chip"
import { SortPickerChip, type SortPickerField } from "./toolbar-controls/sort-picker-chip"
import { TemplateFilterChip } from "./toolbar-controls/template-filter-chip"
import { WarehouseFilterChip } from "./toolbar-controls/warehouse-filter-chip"
import { WorkOrdersListSearch } from "./toolbar-controls/work-orders-list-search"
import { WorkOrdersClearAll } from "./toolbar-controls/sub-controls/work-orders-clear-all"
import { WorkOrdersRowCount } from "./toolbar-controls/sub-controls/work-orders-row-count"

const WORK_ORDERS_ALLOWED_SORT_FIELDS = ["createdAt", "scheduledFor"] as const

export default function WorkOrdersClient({
  initialSearchQuery,
  initialPage,
  initialFilters,
  initialMgmtCoOptions,
  initialSelectedMgmtCo = null,
  initialPropertyOptions,
  initialSelectedProperty = null,
  initialTemplateOptions,
  initialSelectedTemplate = null,
  initialWarehouseOptions,
  initialSelectedWarehouse = null,
}: {
  initialSearchQuery: string
  initialPage: number
  initialFilters: WorkOrdersListFilters
  initialMgmtCoOptions: ManagementCompanyOption[]
  initialSelectedMgmtCo?: ManagementCompanyOption | null
  initialPropertyOptions: PropertyOption[]
  initialSelectedProperty?: PropertyOption | null
  initialTemplateOptions: TemplateOption[]
  initialSelectedTemplate?: TemplateOption | null
  initialWarehouseOptions: WarehouseOption[]
  initialSelectedWarehouse?: WarehouseOption | null
}) {
  const { message, pageError, openCreate, openWorkOrder } = useWorkOrdersListController()

  const {
    rows,
    total,
    searchQuery,
    filters,
    sort,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    onSearchQueryChange,
    onSortChange,
    onFilterChange,
    onClearAllFilters,
  } = useFetchListController<WorkOrderListRow, WorkOrdersListFilters>({
    mode: "fetch",
    queryKey: [...WORK_ORDERS_LIST_QUERY_KEY],
    listFn: listWorkOrdersRequest,
    initialSearchQuery,
    initialSort: { field: "createdAt", direction: "desc" },
    initialGroupField: null,
    initialPage,
    initialFilters,
    pageSize: WORK_ORDERS_LIST_PAGE_SIZE,
    tableKey: "work-orders-main",
    allowedSortFields: WORK_ORDERS_ALLOWED_SORT_FIELDS,
    allowedGroupFields: [],
    filterableFields: WORK_ORDERS_LIST_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  // --- Selected values from the filter map ---
  const selectedMgmtCoId = filters.managementCompanyId?.[0] ?? null
  const selectedPropertyId = filters.propertyId?.[0] ?? null
  const selectedTemplateId = filters.templateId?.[0] ?? null
  const selectedWarehouseId = filters.warehouseId?.[0] ?? null
  const selectedScheduledStart = filters.scheduledForStart?.[0] ?? null
  const selectedScheduledEnd = filters.scheduledForEnd?.[0] ?? null

  // --- Selected-label snapshots (initial-seed + fallback to current options) ---
  const mgmtCoLabel = useMemo(() => {
    if (!selectedMgmtCoId) return null
    if (initialSelectedMgmtCo?.id === selectedMgmtCoId) return initialSelectedMgmtCo.name
    return initialMgmtCoOptions.find((o) => o.id === selectedMgmtCoId)?.name ?? null
  }, [selectedMgmtCoId, initialSelectedMgmtCo, initialMgmtCoOptions])

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

  // --- Cascade-clear handlers ---
  // Mgmt Co change → clear Property + Template (property-scoped chain).
  // Property change → clear Template (template is property-scoped).

  const handleMgmtCoChange = useCallback(
    (id: string | null) => {
      onFilterChange("managementCompanyId", id ? [id] : [])
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

  const handleScheduledForChange = useCallback(
    (start: string | null, end: string | null) => {
      onFilterChange("scheduledForStart", start ? [start] : [])
      onFilterChange("scheduledForEnd", end ? [end] : [])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (
      selectedMgmtCoId ||
      selectedPropertyId ||
      selectedTemplateId ||
      selectedWarehouseId ||
      selectedScheduledStart ||
      selectedScheduledEnd
    ) {
      return true
    }
    return false
  }, [
    searchQuery,
    selectedMgmtCoId,
    selectedPropertyId,
    selectedTemplateId,
    selectedWarehouseId,
    selectedScheduledStart,
    selectedScheduledEnd,
  ])

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
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
          <ListToolbar className="pt-0">
            {/* Search + (Clear all | row count) — encased card attached to the tab above */}
            <ListToolbarCell>
              <div className="flex flex-col gap-2 rounded-md rounded-tl-none border border-[var(--panel-border)] p-2">
                <WorkOrdersListSearch
                  query={searchQuery}
                  onQueryChange={onSearchQueryChange}
                />
                <ListToolbarBottomRow
                  left={<WorkOrdersClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
                  right={<WorkOrdersRowCount count={rows.length} total={total} />}
                />
              </div>
            </ListToolbarCell>

            {/* Mgmt Co → Property: property is mgmt-co-scoped (mgmt-co change
                cascades the property + template chip clears via
                handleMgmtCoChange). */}
            <ListToolbarCell>
              <MgmtCoFilterChip
                value={selectedMgmtCoId}
                selectedLabel={mgmtCoLabel}
                onChange={handleMgmtCoChange}
                initialOptions={initialMgmtCoOptions}
              />
              <PropertyFilterChip
                value={selectedPropertyId}
                selectedLabel={propertyLabel}
                managementCompanyId={selectedMgmtCoId}
                onChange={handlePropertyChange}
                initialOptions={initialPropertyOptions}
              />
            </ListToolbarCell>

            {/* Warehouse (independent) + Template (property-scoped). Template
                picker is disabled until a property is picked; property change
                cascades the template chip clear via handlePropertyChange. */}
            <ListToolbarCell>
              <WarehouseFilterChip
                value={selectedWarehouseId}
                selectedLabel={warehouseLabel}
                onChange={handleWarehouseChange}
                initialOptions={initialWarehouseOptions}
              />
              <TemplateFilterChip
                value={selectedTemplateId}
                selectedLabel={templateLabel}
                propertyId={selectedPropertyId}
                onChange={handleTemplateChange}
                initialOptions={initialTemplateOptions}
              />
            </ListToolbarCell>

            {/* Scheduled-for date filter (top) + sort picker (under it).
                Sort picker: Created date or Scheduled date, each asc/desc. */}
            <ListToolbarCell>
              <ScheduledForFilterChip
                start={selectedScheduledStart}
                end={selectedScheduledEnd}
                onChange={handleScheduledForChange}
              />
              <SortPickerChip
                field={(sort?.field as SortPickerField) ?? "createdAt"}
                direction={sort?.direction ?? "desc"}
                onChange={onSortChange}
              />
            </ListToolbarCell>

            <ListToolbarCell className="ml-auto">
              <AddWorkOrderButton onClick={() => openCreate()} />
            </ListToolbarCell>
          </ListToolbar>
        </div>

        <WorkOrdersTable
          rows={rows}
          onOpenWorkOrder={openWorkOrder}
          pagination={
            <PaginateControls
              page={page}
              pageSize={pageSize}
              totalItems={total}
              totalPages={totalPages}
              hasPreviousPage={hasPreviousPage}
              hasNextPage={hasNextPage}
              onPreviousPage={goToPreviousPage}
              onNextPage={goToNextPage}
            />
          }
        />
      </div>
    </div>
  )
}
