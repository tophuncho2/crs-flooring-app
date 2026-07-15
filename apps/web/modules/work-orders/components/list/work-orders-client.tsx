"use client"

import { useCallback, useEffect, useMemo } from "react"
import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react"
import {
  DebouncedSearchControl,
  StateSearchControl,
  SortMenuBody,
  FilterGroupLabel,
  ListActionBar,
  ListCreateButtonPortal,
  ListExportButton,
  ListPageShell,
  ListPageFeedback,
  ToolbarMenuButton,
  useFetchListController,
  useListSelection,
  LIST_FRESHNESS_STANDARD,
} from "@/engines/list-view"
import {
  FilterPickerChip,
  MultiFilterPickerChip,
  usePickedOptionLabel,
  useMultiPickedOptionLabels,
} from "@/engines/picker"
import { reconnectGoogleForSheets } from "@/modules/auth/reconnect-google"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import { TemplatePicker } from "@/modules/templates/components/picker/template-picker"
import {
  WAREHOUSE_OPTIONS_QUERY_KEY,
  searchWarehouseOptionsRequest,
} from "@/modules/warehouse/data/warehouse-options-request"
import {
  JOB_TYPE_OPTIONS_QUERY_KEY,
  searchJobTypeOptionsRequest,
} from "@/modules/job-types/data/job-type-options-request"
import type { WorkOrdersListFilters } from "@builders/application"
import { WORK_ORDER_EXPORT_COLUMNS } from "@builders/domain"
import type {
  JobTypeOption,
  EntityOption,
  PropertyOption,
  TemplateOption,
  WarehouseOption,
  WorkOrderListRow,
} from "@builders/domain"
import {
  buildWorkOrdersExportQuery,
  WORK_ORDERS_LIST_FILTERABLE_FIELDS,
  WORK_ORDERS_LIST_PAGE_SIZE,
  WORK_ORDERS_LIST_QUERY_KEY,
  listWorkOrdersRequest,
} from "@/modules/work-orders/data/list-work-orders-request"
import { useWorkOrdersListController } from "@/modules/work-orders/controllers/list/use-work-orders-list-controller"
import { WorkOrdersTable } from "./work-orders-table"
import {
  WORK_ORDERS_ALLOWED_SORT_FIELDS,
  WORK_ORDERS_MAX_SORT_LEVELS,
  WORK_ORDERS_SORT_OPTIONS,
} from "./table/work-orders-list-columns"
import { ScheduledForFilterBody } from "./toolbar-controls/scheduled-for-filter-body"
import { VacancyFilterChip } from "./toolbar-controls/vacancy-filter-chip"

// Stable option mappers (module-level so the chip's memoized option list
// doesn't recompute every render).
const toWarehouseFilterOption = (option: WarehouseOption) => ({
  id: option.id,
  title: option.name,
})
const toJobTypeFilterOption = (option: JobTypeOption) => ({
  id: option.id,
  title: option.name,
})

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
    hasNonDefaultSort,
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
    columnWidths,
    onColumnWidthsChange,
  } = useFetchListController<WorkOrderListRow, WorkOrdersListFilters>({
    mode: "fetch",
    queryKey: [...WORK_ORDERS_LIST_QUERY_KEY],
    listFn: listWorkOrdersRequest,
    initialSearchQuery,
    initialPage,
    initialFilters,
    pageSize: WORK_ORDERS_LIST_PAGE_SIZE,
    tableKey: "work-orders-main",
    allowedSortFields: WORK_ORDERS_ALLOWED_SORT_FIELDS,
    maxSortLevels: WORK_ORDERS_MAX_SORT_LEVELS,
    filterableFields: WORK_ORDERS_LIST_FILTERABLE_FIELDS,
    freshness: LIST_FRESHNESS_STANDARD,
  })

  // Row selection (CSV export scope). Checkboxes are always visible on the table
  // (opt-in by wiring selection here) — no export-menu gate. Cleared whenever the
  // filtered/sorted scope changes so a ticked id from a prior scope can't leak
  // into an export.
  const selection = useListSelection()

  const scopeSignature = useMemo(() => JSON.stringify({ filters, sorts }), [filters, sorts])
  useEffect(() => {
    selection.clear()
    // Clear only when the filtered/sorted scope changes — NOT on every selection
    // mutation (depending on `selection` would wipe ticks the instant they're made).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeSignature])

  const selectedIds = useMemo(() => [...selection.selectedIds], [selection.selectedIds])
  const exportQuery = useMemo(
    () =>
      buildWorkOrdersExportQuery({
        sort: sort ?? undefined,
        sorts,
        filters,
        page: 1,
        pageSize: WORK_ORDERS_LIST_PAGE_SIZE,
      }),
    [sort, sorts, filters],
  )
  const exportColumns = useMemo(
    () => WORK_ORDER_EXPORT_COLUMNS.map((column) => ({ key: column.key, label: column.label })),
    [],
  )

  // --- Selected values from the filter map ---
  const selectedEntityId = filters.entityId?.[0] ?? null
  const selectedPropertyId = filters.propertyId?.[0] ?? null
  const selectedTemplateId = filters.templateId?.[0] ?? null
  const selectedWarehouseIds = useMemo(() => filters.warehouseId ?? [], [filters.warehouseId])
  const selectedJobTypeIds = useMemo(() => filters.jobTypeId ?? [], [filters.jobTypeId])
  const selectedVacancy = filters.vacancy?.[0] ?? null
  const selectedScheduledStart = filters.scheduledForStart?.[0] ?? null
  const selectedScheduledEnd = filters.scheduledForEnd?.[0] ?? null

  // --- Column-header sort (DataTable) ---
  // --- Per-column identity search bars ---
  const unitTypeValue = filters.unitType?.[0] ?? ""
  const unitNumberValue = filters.unitNumber?.[0] ?? ""
  const workOrderNumberValue = filters.workOrderNumber?.[0] ?? ""
  const descriptionValue = filters.description?.[0] ?? ""
  const purchaseOrderNumberValue = filters.purchaseOrderNumber?.[0] ?? ""
  // WO-owned address search bars (street/city/zip = ILIKE; state = exact 2-letter).
  const streetAddressValue = filters.streetAddress?.[0] ?? ""
  const cityValue = filters.city?.[0] ?? ""
  const postalCodeValue = filters.postalCode?.[0] ?? ""
  const selectedState = filters.state?.[0] ?? null

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

  // Seed labels for every selected id (multi-select) — the picked-label hook
  // overlays async-search picks on top of these SSR-frozen seeds.
  const warehouseSeedLabels = useMemo(
    () =>
      selectedWarehouseIds.flatMap((id) => {
        const name =
          initialSelectedWarehouse?.id === id
            ? initialSelectedWarehouse.name
            : initialWarehouseOptions.find((o) => o.id === id)?.name ?? null
        return name ? [{ id, label: name }] : []
      }),
    [selectedWarehouseIds, initialSelectedWarehouse, initialWarehouseOptions],
  )

  const jobTypeSeedLabels = useMemo(
    () =>
      selectedJobTypeIds.flatMap((id) => {
        const name =
          initialSelectedJobType?.id === id
            ? initialSelectedJobType.name
            : initialJobTypeOptions.find((o) => o.id === id)?.name ?? null
        return name ? [{ id, label: name }] : []
      }),
    [selectedJobTypeIds, initialSelectedJobType, initialJobTypeOptions],
  )

  // Trigger-label glue: the useMemos above seed the label from the SSR options;
  // the hook overlays the actually-picked option so async-search picks (outside
  // the seed) still render a label. See `usePickedOptionLabel`.
  const entityFilter = usePickedOptionLabel<EntityOption>(
    selectedEntityId,
    entityLabel,
    (option) => option.entity,
  )
  const propertyFilter = usePickedOptionLabel<PropertyOption>(
    selectedPropertyId,
    propertyLabel,
    (option) => option.name,
  )
  const templateFilter = usePickedOptionLabel<TemplateOption>(
    selectedTemplateId,
    templateLabel,
    (option) => option.unitType,
  )
  const warehouseFilter = useMultiPickedOptionLabels<WarehouseOption>(
    selectedWarehouseIds,
    warehouseSeedLabels,
    (option) => option.name,
  )
  const jobTypeFilter = useMultiPickedOptionLabels<JobTypeOption>(
    selectedJobTypeIds,
    jobTypeSeedLabels,
    (option) => option.name,
  )

  // --- Cascade-clear handlers ---
  // Entity change → clear Property + Template (property-scoped chain).
  // Property change → clear Template (template is property-scoped).

  const handleTextFilterChange = useCallback(
    (
      key:
        | "unitType"
        | "unitNumber"
        | "workOrderNumber"
        | "description"
        | "purchaseOrderNumber"
        | "streetAddress"
        | "city"
        | "postalCode",
      next: string,
    ) => {
      const trimmed = next.trim()
      onFilterChange(key, trimmed.length > 0 ? [trimmed] : [])
    },
    [onFilterChange],
  )

  const handleStateChange = useCallback(
    (next: string | null) => {
      onFilterChange("state", next ? [next] : [])
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
    (ids: string[]) => {
      onFilterChange("warehouseId", ids)
    },
    [onFilterChange],
  )

  const handleJobTypeChange = useCallback(
    (ids: string[]) => {
      onFilterChange("jobTypeId", ids)
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

  // Each tool lights its own dot. Sort = the multi-column builder; Filter = the
  // Entity→Property→Template chain + Warehouse/JobType/Vacancy + the scheduled-for
  // date range; Search = the unit type / unit # / description / WO # bars.
  // An active user sort folds into the single ListActionBar "Clear all" signal
  // (filters + search + sort); the Sort menu no longer carries its own Clear.
  const hasActiveSortTool = hasNonDefaultSort

  const hasActiveFilterTool = useMemo(
    () =>
      Boolean(selectedEntityId) ||
      Boolean(selectedPropertyId) ||
      Boolean(selectedTemplateId) ||
      selectedWarehouseIds.length > 0 ||
      selectedJobTypeIds.length > 0 ||
      Boolean(selectedVacancy) ||
      Boolean(selectedScheduledStart) ||
      Boolean(selectedScheduledEnd),
    [
      selectedEntityId,
      selectedPropertyId,
      selectedTemplateId,
      selectedWarehouseIds,
      selectedJobTypeIds,
      selectedVacancy,
      selectedScheduledStart,
      selectedScheduledEnd,
    ],
  )

  const hasActiveSearchTool = useMemo(
    () =>
      Boolean(unitTypeValue) ||
      Boolean(unitNumberValue) ||
      Boolean(workOrderNumberValue) ||
      Boolean(descriptionValue) ||
      Boolean(purchaseOrderNumberValue) ||
      Boolean(streetAddressValue) ||
      Boolean(cityValue) ||
      Boolean(postalCodeValue) ||
      Boolean(selectedState),
    [
      unitTypeValue,
      unitNumberValue,
      workOrderNumberValue,
      descriptionValue,
      purchaseOrderNumberValue,
      streetAddressValue,
      cityValue,
      postalCodeValue,
      selectedState,
    ],
  )

  const hasActiveFilters = useMemo(
    () => hasActiveFilterTool || hasActiveSearchTool || hasActiveSortTool,
    [hasActiveFilterTool, hasActiveSearchTool, hasActiveSortTool],
  )

  const handleClearAll = useCallback(() => {
    onClearAllFilters()
  }, [onClearAllFilters])

  return (
    <ListPageShell fill>
      <ListCreateButtonPortal label="Work Order" onClick={() => openCreate()} />

      <ListPageFeedback message={message} pageError={pageError} />

      <ListActionBar
        label="Work Orders"
        hasActiveFilters={hasActiveFilters}
        onClearAll={handleClearAll}
      >
        {/* Sort — the multi-column builder, leftmost. Single-column sort stays a
            header-caret click on the table. */}
        <ToolbarMenuButton
          label="Sort"
          title="Sort by"
          icon={ArrowUpDown}
          active={hasActiveSortTool}
          bodyClassName="w-auto"
        >
          <SortMenuBody
            options={WORK_ORDERS_SORT_OPTIONS}
            value={sorts}
            maxLevels={WORK_ORDERS_MAX_SORT_LEVELS}
            onChange={onSortsChange}
          />
        </ToolbarMenuButton>

        {/* Filter — two grouped columns (Scope cascade | Attributes) over the
            full-width scheduled-for date range, so the date filters stay in view
            without scrolling. Pickers are composed directly (NOT a
            self-triggering FilterControl). */}
        <ToolbarMenuButton
          label="Filter"
          icon={SlidersHorizontal}
          active={hasActiveFilterTool}
          bodyClassName="w-[30rem]"
          maxHeight={560}
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {/* Scope — the Entity → Property → Template dependent cascade. */}
            <div className="flex flex-col gap-2">
              <FilterGroupLabel>Scope</FilterGroupLabel>
              <FilterPickerChip<EntityOption>
                value={selectedEntityId}
                onChange={handleEntityChange}
                selectedLabel={entityFilter.selectedLabel}
                onOptionSelected={entityFilter.onOptionSelected}
                nounSingular="Entity"
                nounPlural="entities"
                subject="work orders"
              >
                {(chrome) => (
                  <EntityTypePicker {...chrome} initialOptions={initialEntityOptions} />
                )}
              </FilterPickerChip>
              <FilterPickerChip<PropertyOption>
                value={selectedPropertyId}
                onChange={handlePropertyChange}
                selectedLabel={propertyFilter.selectedLabel}
                onOptionSelected={propertyFilter.onOptionSelected}
                nounSingular="Property"
                nounPlural="properties"
                subject="work orders"
              >
                {(chrome) => (
                  <PropertyPicker
                    {...chrome}
                    entityId={selectedEntityId}
                    initialOptions={initialPropertyOptions}
                  />
                )}
              </FilterPickerChip>
              <FilterPickerChip<TemplateOption>
                value={selectedTemplateId}
                onChange={handleTemplateChange}
                selectedLabel={templateFilter.selectedLabel}
                onOptionSelected={templateFilter.onOptionSelected}
                nounSingular="Template"
                nounPlural="templates"
                subject="work orders"
              >
                {(chrome) => (
                  <TemplatePicker
                    {...chrome}
                    propertyId={selectedPropertyId}
                    entityId={selectedEntityId}
                    initialOptions={initialTemplateOptions}
                  />
                )}
              </FilterPickerChip>
            </div>

            {/* Attributes — independent narrowing filters. */}
            <div className="flex flex-col gap-2">
              <FilterGroupLabel>Attributes</FilterGroupLabel>
              <MultiFilterPickerChip<WarehouseOption>
                values={selectedWarehouseIds}
                onChange={handleWarehouseChange}
                labels={warehouseFilter.labels}
                onOptionSelected={warehouseFilter.onOptionSelected}
                nounSingular="Warehouse"
                nounPlural="warehouses"
                subject="work orders"
                bucketKey={WAREHOUSE_OPTIONS_QUERY_KEY}
                pagedSearchFn={searchWarehouseOptionsRequest}
                toOption={toWarehouseFilterOption}
                initialOptions={initialWarehouseOptions}
                placeholder="Warehouse"
              />
              <MultiFilterPickerChip<JobTypeOption>
                values={selectedJobTypeIds}
                onChange={handleJobTypeChange}
                labels={jobTypeFilter.labels}
                onOptionSelected={jobTypeFilter.onOptionSelected}
                nounSingular="Job type"
                nounPlural="job types"
                subject="work orders"
                bucketKey={JOB_TYPE_OPTIONS_QUERY_KEY}
                searchFn={searchJobTypeOptionsRequest}
                toOption={toJobTypeFilterOption}
                initialOptions={initialJobTypeOptions}
                placeholder="Job types"
              />
              <VacancyFilterChip value={selectedVacancy} onChange={handleVacancyChange} />
            </div>
          </div>

          {/* Scheduled-for date range — full width beneath the two columns. */}
          <div className="flex flex-col gap-2 border-t border-[var(--panel-border)] pt-3">
            <FilterGroupLabel>Scheduled for</FilterGroupLabel>
            <ScheduledForFilterBody
              start={selectedScheduledStart}
              end={selectedScheduledEnd}
              onChange={handleScheduledForChange}
            />
          </div>
        </ToolbarMenuButton>

        {/* Search — the per-column identity bars + WO # exact number. */}
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={hasActiveSearchTool}
        >
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
          <DebouncedSearchControl
            value={workOrderNumberValue}
            onCommit={(next) => handleTextFilterChange("workOrderNumber", next)}
            placeholder="WO #"
            ariaLabel="Search work orders by work order number"
          />
          <DebouncedSearchControl
            value={purchaseOrderNumberValue}
            onCommit={(next) => handleTextFilterChange("purchaseOrderNumber", next)}
            placeholder="PO #"
            ariaLabel="Search work orders by purchase order number"
          />
          <DebouncedSearchControl
            value={streetAddressValue}
            onCommit={(next) => handleTextFilterChange("streetAddress", next)}
            placeholder="Street"
            ariaLabel="Search work orders by street address"
          />
          <DebouncedSearchControl
            value={cityValue}
            onCommit={(next) => handleTextFilterChange("city", next)}
            placeholder="City"
            ariaLabel="Search work orders by city"
          />
          <StateSearchControl
            value={selectedState}
            onChange={handleStateChange}
            placeholder="State"
            ariaLabel="Search work orders by state"
          />
          <DebouncedSearchControl
            value={postalCodeValue}
            onCommit={(next) => handleTextFilterChange("postalCode", next)}
            placeholder="Zip"
            ariaLabel="Search work orders by zip"
          />
        </ToolbarMenuButton>

        {/* Export — column-picker + row-cap; exports the ticked rows, or the
            whole filtered set when nothing is ticked. */}
        <ListExportButton
          endpoint="/api/work-orders/export"
          query={exportQuery}
          columns={exportColumns}
          filename="work-orders-export.csv"
          selectedIds={selectedIds}
          onReauthRequired={reconnectGoogleForSheets}
        />
      </ListActionBar>

      <WorkOrdersTable
        rows={rows}
        onOpenWorkOrder={openWorkOrder}
        selection={selection}
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
