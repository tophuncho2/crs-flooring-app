"use client"

import { useCallback, useMemo } from "react"
import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import {
  ClearAllFiltersButton,
  FilterToolbar,
} from "@/components/features/filter"
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
import { WorkOrderMgmtCoFilterChip } from "./work-order-mgmt-co-filter-chip"
import { WorkOrderPropertyFilterChip } from "./work-order-property-filter-chip"
import { WorkOrderTemplateFilterChip } from "./work-order-template-filter-chip"
import { WorkOrderWarehouseFilterChip } from "./work-order-warehouse-filter-chip"
import {
  WorkOrderCompleteFilterChip,
  type WorkOrderCompleteFilterValue,
} from "./work-order-complete-filter-chip"

const WORK_ORDERS_ALLOWED_SORT_FIELDS = ["workOrderNumber"] as const

const COMPLETE_DEFAULT: WorkOrderCompleteFilterValue = "hide"

function asCompleteValue(raw: string | undefined): WorkOrderCompleteFilterValue {
  if (raw === "only" || raw === "all" || raw === "hide") return raw
  return COMPLETE_DEFAULT
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
    (next: WorkOrderCompleteFilterValue) => {
      // Default "hide" is encoded as URL-absent; explicit non-default values are written.
      onFilterChange("isComplete", next === COMPLETE_DEFAULT ? [] : [next])
    },
    [onFilterChange],
  )

  const hasActiveFilters = useMemo(() => {
    if (searchQuery.trim().length > 0) return true
    if (selectedMgmtCoId || selectedPropertyId || selectedTemplateId || selectedWarehouseId) {
      return true
    }
    if (completeValue !== COMPLETE_DEFAULT) return true
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
        <SectionHeader
          title="Work Orders"
          actions={[
            { key: "new", label: "+ Work Order", onClick: () => openCreate(), kind: "primary" },
          ]}
        />

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

        <FilterToolbar>
          <div className="min-w-[16rem] flex-1">
            <SearchControl
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
              placeholder="Search WO #, description, property, job type"
            />
          </div>

          <WorkOrderMgmtCoFilterChip
            value={selectedMgmtCoId}
            selectedLabel={mgmtCoLabel}
            onChange={handleMgmtCoChange}
            initialOptions={initialMgmtCoOptions}
          />

          <WorkOrderPropertyFilterChip
            value={selectedPropertyId}
            selectedLabel={propertyLabel}
            onChange={handlePropertyChange}
            managementCompanyId={selectedMgmtCoId}
            initialOptions={initialPropertyOptions}
          />

          <WorkOrderTemplateFilterChip
            value={selectedTemplateId}
            selectedLabel={templateLabel}
            onChange={handleTemplateChange}
            propertyId={selectedPropertyId}
            initialOptions={initialTemplateOptions}
          />

          <WorkOrderWarehouseFilterChip
            value={selectedWarehouseId}
            selectedLabel={warehouseLabel}
            onChange={handleWarehouseChange}
            initialOptions={initialWarehouseOptions}
          />

          <span aria-hidden="true" className="mx-1 h-6 w-px bg-[var(--panel-border)]" />

          <WorkOrderCompleteFilterChip
            value={completeValue}
            onChange={handleCompleteChange}
          />

          <ClearAllFiltersButton hasActive={hasActiveFilters} onClick={handleClearAll} />

          <span className="text-xs text-[var(--foreground)]/55">
            {rows.length} of {total} work orders
          </span>
        </FilterToolbar>

        <WorkOrdersTable
          rows={rows}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={total}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onOpenWorkOrder={openWorkOrder}
        />
      </div>
    </div>
  )
}
