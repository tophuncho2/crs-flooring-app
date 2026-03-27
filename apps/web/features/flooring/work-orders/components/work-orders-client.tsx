"use client"

import { type ReactNode } from "react"
import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/flooring/shared/ui/display/accent-styles"
import {
  DASHBOARD_PAGE_SHELL_EDGE_TO_EDGE_CLASS_NAME,
  DashboardCardTitle,
} from "@/features/flooring/shared/ui/display/dashboard-card-title"
import { DashboardTableSurface } from "@/features/flooring/shared/ui/display/dashboard-table-surface"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { TableFilterControls } from "@/features/flooring/shared/ui/table/table-filter-controls"
import { DeleteRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import { TableColumnSettings } from "@/features/flooring/shared/ui/table/table-column-settings"
import TableControlsBar from "@/features/flooring/shared/ui/table/table-controls-bar"
import {
  ClickableTableRow,
  DashboardTableCell,
  EmbeddedPageTableShell,
  TableActionsSummary,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TablePaginationControls,
} from "@/features/flooring/shared/ui/table/table-shell"
import { renderGroupedTableRows } from "@/features/flooring/shared/ui/table/render-grouped-table-rows"
import { useCanonicalDetailNavigation } from "@/features/flooring/shared/controllers/navigation/use-canonical-detail-navigation"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { MAX_GROUP_FIELDS } from "@/features/flooring/shared/controllers/table/use-table-controls"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import { getWorkOrderStatusFieldClass, getWorkOrderStatusLabel } from "../contracts"
import type {
  PropertyOption,
  ServerPaginationState,
  ServerTableState,
  TemplateOption,
  WarehouseOption,
  WorkOrderRow,
  WorkOrderServerFilterState,
} from "../types"
import { createWorkOrdersPageFilterDefinitions } from "../table-filters"
import { useWorkOrdersClientController } from "../use-work-orders-client-controller"
import { WorkOrderCreateModal } from "./work-order-create-modal"
import { WorkOrderSyncModal } from "./work-order-sync-modal"

function workOrderStatusText(row: Pick<WorkOrderRow, "status" | "isComplete" | "hasShortage">) {
  return getWorkOrderStatusLabel(row)
}

export default function WorkOrdersClient({
  initialWorkOrders,
  propertyOptions,
  warehouseOptions,
  templateOptions,
  initialTablePreferences,
  tableState,
  filterState,
  pagination,
}: {
  initialWorkOrders: WorkOrderRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  templateOptions: TemplateOption[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: ServerTableState
  filterState: WorkOrderServerFilterState
  pagination?: ServerPaginationState
}) {
  const controller = useWorkOrdersClientController({
    initialRows: initialWorkOrders,
    propertyOptions,
    templateOptions,
  })
  const workOrderNavigation = useCanonicalDetailNavigation("/dashboard/flooring/work-orders")
  const {
    searchQuery,
    isAscendingSort,
    isGroupingEnabled,
    groupByKeys,
    filteredRows: filteredWorkOrders,
    sortedRows: sortedWorkOrders,
    groupedRowTree: groupedWorkOrders,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    allColumns: orderedWorkOrderColumns,
    visibleColumns: visibleWorkOrderColumns,
    hiddenColumnKeys: hiddenWorkOrderColumnKeys,
    toggleColumnVisibility: toggleWorkOrderColumnVisibility,
    moveColumn: moveWorkOrderColumn,
    setColumnOrder: setWorkOrderColumnOrder,
    onSearchQueryChange,
    onToggleSort,
    onToggleGroupedColumn,
    filterGroups,
  } = useConfiguredTableState({
    rows: controller.rows,
    tableKey: "work-orders-main",
    fields: [
      { key: "wo", label: "WO", getValue: (row) => row.workOrderNumber, groupable: false },
      { key: "status", label: "Status", getValue: (row) => workOrderStatusText(row), groupable: true },
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.warehouseName, groupable: true },
      { key: "property", label: "Property", getValue: (row) => row.propertyName, groupable: true },
      { key: "address", label: "Address", getValue: (row) => row.customAddress.trim() || row.propertyAddress, groupable: false },
      { key: "customAddress", label: "Custom Address", getValue: (row) => row.customAddress, groupable: false },
      { key: "date", label: "Date", getValue: (row) => (row.date ? row.date.split("T")[0] : "No Date"), groupable: true },
      { key: "unit", label: "Unit", getValue: (row) => row.unitText, groupable: false },
      { key: "unitType", label: "Unit Type", getValue: (row) => row.unitType, groupable: true },
      { key: "vacancy", label: "Vacancy", getValue: (row) => row.vacancy ?? "", groupable: true },
      { key: "instructions", label: "Instructions", getValue: (row) => row.instructions, groupable: false },
      { key: "notes", label: "Notes", getValue: (row) => row.notes, groupable: false },
      { key: "items", label: "Items", getValue: (row) => String(row.itemsCount ?? 0), groupable: false },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => row.workOrderNumber,
    sortFieldKey: "wo",
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    filterDefinitions: createWorkOrdersPageFilterDefinitions(warehouseOptions),
    initialFilters: filterState,
    urlSyncMode: "router",
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
    initialPreferences: initialTablePreferences,
  })

  function renderWorkOrderRow(row: WorkOrderRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      wo: (columnIndex) => (
        <DashboardTableCell key="wo" columnIndex={columnIndex} className="font-medium text-blue-500">
          {row.workOrderNumber}
        </DashboardTableCell>
      ),
      status: (
        columnIndex,
      ) => (
        <DashboardTableCell key="status" columnIndex={columnIndex}>
          {row.isComplete ? (
            <span className="inline-flex min-w-[110px] rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-center text-sm text-emerald-700">
              Complete
            </span>
          ) : (
            <span className={`inline-flex min-w-[110px] rounded border px-2 py-1 text-center text-sm ${getWorkOrderStatusFieldClass(row.status)}`}>
              {workOrderStatusText(row)}
            </span>
          )}
        </DashboardTableCell>
      ),
      warehouse: (columnIndex) => <DashboardTableCell key="warehouse" columnIndex={columnIndex}>{row.warehouseName || "-"}</DashboardTableCell>,
      property: (columnIndex) => <DashboardTableCell key="property" columnIndex={columnIndex}>{row.propertyName}</DashboardTableCell>,
      address: (columnIndex) => (
        <DashboardTableCell key="address" columnIndex={columnIndex}>
          {row.customAddress.trim() || row.propertyAddress || "-"}
        </DashboardTableCell>
      ),
      customAddress: (columnIndex) => <DashboardTableCell key="customAddress" columnIndex={columnIndex}>{row.customAddress || "-"}</DashboardTableCell>,
      date: (columnIndex) => <DashboardTableCell key="date" columnIndex={columnIndex}>{row.date ? row.date.split("T")[0] : "-"}</DashboardTableCell>,
      unit: (columnIndex) => <DashboardTableCell key="unit" columnIndex={columnIndex}>{row.unitText || "-"}</DashboardTableCell>,
      unitType: (columnIndex) => <DashboardTableCell key="unitType" columnIndex={columnIndex}>{row.unitType || "-"}</DashboardTableCell>,
      vacancy: (columnIndex) => <DashboardTableCell key="vacancy" columnIndex={columnIndex}>{row.vacancy || "-"}</DashboardTableCell>,
      instructions: (columnIndex) => <DashboardTableCell key="instructions" columnIndex={columnIndex}>{row.instructions || "-"}</DashboardTableCell>,
      notes: (columnIndex) => <DashboardTableCell key="notes" columnIndex={columnIndex}>{row.notes || "-"}</DashboardTableCell>,
      items: (columnIndex) => <DashboardTableCell key="items" columnIndex={columnIndex}>{row.itemsCount}</DashboardTableCell>,
      delete: (columnIndex) => (
        <DashboardTableCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => void controller.deleteWorkOrder(row.id)} disabled={controller.deletingId === row.id}>
            {controller.deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardTableCell>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Edit work order ${row.workOrderNumber}`} onClick={() => workOrderNavigation.openRecord(row.id)}>
        {visibleWorkOrderColumns.map((column, columnIndex) => cells[column.key](columnIndex))}
      </ClickableTableRow>
    )
  }

  return (
    <div className={DASHBOARD_PAGE_SHELL_EDGE_TO_EDGE_CLASS_NAME}>
      <div className="w-full space-y-6">
        <DashboardTableSurface
          title={<DashboardCardTitle>Work Orders</DashboardCardTitle>}
          actions={
            <TableActionsSummary count={filteredWorkOrders.length}>
              <TableControlsBar
                searchQuery={searchQuery}
                onSearchQueryChange={onSearchQueryChange}
                searchPlaceholder="Search property"
                isAscendingSort={isAscendingSort}
                onToggleSort={onToggleSort}
                ascendingSortLabel="1-9"
                descendingSortLabel="9-1"
              >
                <TableFilterControls groups={filterGroups} panelKey="work-orders-main-filters" />
                <TableColumnSettings
                  columns={orderedWorkOrderColumns}
                  hiddenColumnKeys={hiddenWorkOrderColumnKeys}
                  onToggleColumn={toggleWorkOrderColumnVisibility}
                  onMoveColumn={moveWorkOrderColumn}
                  onSetColumnOrder={setWorkOrderColumnOrder}
                  groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                  maxGroupFields={MAX_GROUP_FIELDS}
                  onToggleGroupedColumn={onToggleGroupedColumn}
                />
                <button type="button" onClick={controller.openCreateModal} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
                  <Plus size={16} />
                  Work Order
                </button>
                <button
                  type="button"
                  onClick={controller.openSyncModal}
                  className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-500/20"
                >
                  Sync Template
                </button>
              </TableControlsBar>
            </TableActionsSummary>
          }
          notices={
            !controller.isCreateModalOpen && !controller.isSyncModalOpen ? (
              <FormStatusNotices message={controller.notices.message} error={controller.notices.error} />
            ) : null
          }
        >
          <EmbeddedPageTableShell minWidthClass="min-w-[1280px]">
              <TableHead>
                <tr>
                  {visibleWorkOrderColumns.map((column) => (
                    <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
                  ))}
                </tr>
              </TableHead>
              <tbody>
                {isGroupingEnabled
                  ? renderGroupedTableRows({
                      groups: groupedWorkOrders,
                      colSpan: visibleWorkOrderColumns.length,
                      renderRow: renderWorkOrderRow,
                    })
                  : sortedWorkOrders.map((row) => renderWorkOrderRow(row))}

                {filteredWorkOrders.length === 0 ? <TableEmptyRow message="No work orders yet." colSpan={visibleWorkOrderColumns.length} /> : null}
              </tbody>
          </EmbeddedPageTableShell>
          <TablePaginationControls
            page={pagination?.page ?? page}
            totalPages={pagination?.totalPages ?? totalPages}
            pageSize={pagination?.pageSize ?? pageSize}
            totalItems={pagination?.totalItems ?? filteredWorkOrders.length}
            hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
            hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
            onPreviousPage={pagination ? undefined : goToPreviousPage}
            onNextPage={pagination ? undefined : goToNextPage}
            previousPageHref={pagination?.previousPageHref}
            nextPageHref={pagination?.nextPageHref}
          />
        </DashboardTableSurface>
      </div>

      {controller.isCreateModalOpen ? (
        <WorkOrderCreateModal
          draft={controller.createDraft}
          propertyOptions={propertyOptions}
          warehouseOptions={warehouseOptions}
          selectedAddress={controller.selectedAddress}
          message={controller.notices.message}
          error={controller.notices.error}
          isSaving={controller.isSavingCreate}
          onClose={controller.closeCreateModal}
          onFieldChange={controller.updateCreateDraft}
          onCreate={async () => {
            const createdWorkOrder = await controller.createWorkOrder()
            if (createdWorkOrder) {
              workOrderNavigation.openRecord(createdWorkOrder.id)
            }
          }}
        />
      ) : null}

      {controller.isSyncModalOpen ? (
        <WorkOrderSyncModal
          propertyOptions={propertyOptions}
          filteredTemplates={controller.filteredSyncTemplates}
          syncPropertyId={controller.syncPropertyId}
          syncTemplateSearch={controller.syncTemplateSearch}
          selectedTemplateId={controller.selectedSyncTemplateId}
          message={controller.notices.message}
          error={controller.notices.error}
          isCreating={controller.isCreatingFromTemplate}
          onClose={controller.closeSyncModal}
          onPropertyChange={controller.setSyncProperty}
          onSearchChange={controller.setSyncTemplateSearch}
          onTemplateSelect={controller.setSelectedSyncTemplateId}
          onCreate={async () => {
            const createdWorkOrder = await controller.createWorkOrderFromTemplate()
            if (createdWorkOrder) {
              workOrderNavigation.openRecord(createdWorkOrder.id)
            }
          }}
        />
      ) : null}
    </div>
  )
}
