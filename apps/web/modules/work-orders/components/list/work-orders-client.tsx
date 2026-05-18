"use client"

import { useCallback, useMemo } from "react"
import { SectionHeader } from "@/components/headers"
import { PaginateControls } from "@/components/features/paginate"
import {
  ListToolbar,
  ListToolbarBottomRow,
  ListToolbarCell,
  ListToolbarTallCard,
} from "@/components/features/list-toolbar"
import { useServerListController } from "@/controllers/list-view"
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
import { TemplateFilterChip } from "./toolbar-controls/template-filter-chip"
import { WarehouseFilterChip } from "./toolbar-controls/warehouse-filter-chip"
import {
  COMPLETE_SEGMENTED_DEFAULT,
  CompleteSegmentedControl,
  type CompleteSegmentedControlValue,
} from "./toolbar-controls/complete-segmented-control"
import { WorkOrdersListSearch } from "./toolbar-controls/work-orders-list-search"
import { WorkOrdersClearAll } from "./toolbar-controls/sub-controls/work-orders-clear-all"
import { WorkOrdersRowCount } from "./toolbar-controls/sub-controls/work-orders-row-count"

const WORK_ORDERS_ALLOWED_SORT_FIELDS = ["workOrderNumber"] as const

function asCompleteValue(raw: string | undefined): CompleteSegmentedControlValue {
  if (raw === "only" || raw === "all" || raw === "hide") return raw
  return COMPLETE_SEGMENTED_DEFAULT
}

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
  } = useServerListController<WorkOrderListRow, WorkOrdersListFilters>({
    mode: "fetch",
    queryKey: [...WORK_ORDERS_LIST_QUERY_KEY],
    listFn: listWorkOrdersRequest,
    initialSearchQuery,
    initialSort: { field: "workOrderNumber", direction: "desc" },
    initialGroupField: null,
    initialPage,
    initialFilters,
    pageSize: WORK_ORDERS_LIST_PAGE_SIZE,
    tableKey: "work-orders-main",
    initialTablePreferences: null,
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
  const completeValue = asCompleteValue(filters.isComplete?.[0])

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
      return `#${initialSelectedTemplate.templateNumber}`
    }
    const match = initialTemplateOptions.find((o) => o.id === selectedTemplateId)
    return match ? `#${match.templateNumber}` : null
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

  const handleCompleteChange = useCallback(
    (next: CompleteSegmentedControlValue) => {
      // Default "hide" is encoded as URL-absent; explicit non-default values are written.
      onFilterChange("isComplete", next === COMPLETE_SEGMENTED_DEFAULT ? [] : [next])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (selectedMgmtCoId || selectedPropertyId || selectedTemplateId || selectedWarehouseId) {
      return true
    }
    if (completeValue !== COMPLETE_SEGMENTED_DEFAULT) return true
    return false
  }, [
    searchQuery,
    selectedMgmtCoId,
    selectedPropertyId,
    selectedTemplateId,
    selectedWarehouseId,
    completeValue,
  ])

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
    onSearchQueryChange("")
  }, [onClearAllFilters, onSearchQueryChange])

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader title="Work Orders" />

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

        <ListToolbar>
          {/* Search + (Clear all | row count) */}
          <ListToolbarCell>
            <WorkOrdersListSearch
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
            />
            <ListToolbarBottomRow
              left={<WorkOrdersClearAll hasActive={hasActiveFilters} onClick={handleClearAll} />}
              right={<WorkOrdersRowCount count={rows.length} total={total} />}
            />
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

          {/* Status: 2-row-tall card holding the complete segmented control. */}
          <ListToolbarCell>
            <ListToolbarTallCard label="Status">
              <CompleteSegmentedControl
                value={completeValue}
                onChange={handleCompleteChange}
              />
            </ListToolbarTallCard>
          </ListToolbarCell>

          {/* Right-anchored action: + Work Order occupies the top row of a
              single right-anchored cell; the bottom row is empty (no
              secondary create flow). */}
          <ListToolbarCell className="ml-auto">
            <AddWorkOrderButton onClick={() => openCreate()} />
          </ListToolbarCell>
        </ListToolbar>

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
