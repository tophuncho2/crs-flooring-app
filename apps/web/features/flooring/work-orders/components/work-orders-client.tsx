"use client"

import { type ReactNode } from "react"
import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/dashboard/shared/display/accent-styles"
import { DashboardCardTitle } from "@/features/dashboard/shared/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { DashboardListPageControls } from "@/features/dashboard/shared/list-page/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/features/dashboard/shared/list-page/dashboard-list-page-scaffold"
import { DashboardListPageTable } from "@/features/dashboard/shared/list-page/dashboard-list-page-table"
import { DashboardListRowCell } from "@/features/dashboard/shared/list-page/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/features/dashboard/shared/list-page/render-dashboard-row-cells"
import { TableFilterControls } from "@/features/dashboard/shared/table/table-filter-controls"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { TableColumnSettings } from "@/features/dashboard/shared/table/table-column-settings"
import {
  ClickableTableRow,
  TableEmptyRow,
  TablePaginationControls,
} from "@/features/dashboard/shared/table/table-shell"
import { renderGroupedTableRows } from "@/features/dashboard/shared/table/render-grouped-table-rows"
import { useCanonicalDetailNavigation } from "@/features/dashboard/shared/navigation/use-canonical-detail-navigation"
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
        <DashboardListRowCell key="wo" columnIndex={columnIndex} className="font-medium text-blue-500">
          {row.workOrderNumber}
        </DashboardListRowCell>
      ),
      status: (
        columnIndex,
      ) => (
        <DashboardListRowCell key="status" columnIndex={columnIndex}>
          {row.isComplete ? (
            <span className="inline-flex min-w-[110px] rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-center text-sm text-emerald-700">
              Complete
            </span>
          ) : (
            <span className={`inline-flex min-w-[110px] rounded border px-2 py-1 text-center text-sm ${getWorkOrderStatusFieldClass(row.status)}`}>
              {workOrderStatusText(row)}
            </span>
          )}
        </DashboardListRowCell>
      ),
      warehouse: (columnIndex) => <DashboardListRowCell key="warehouse" columnIndex={columnIndex}>{row.warehouseName || "-"}</DashboardListRowCell>,
      property: (columnIndex) => <DashboardListRowCell key="property" columnIndex={columnIndex}>{row.propertyName}</DashboardListRowCell>,
      address: (columnIndex) => (
        <DashboardListRowCell key="address" columnIndex={columnIndex}>
          {row.customAddress.trim() || row.propertyAddress || "-"}
        </DashboardListRowCell>
      ),
      customAddress: (columnIndex) => <DashboardListRowCell key="customAddress" columnIndex={columnIndex}>{row.customAddress || "-"}</DashboardListRowCell>,
      date: (columnIndex) => <DashboardListRowCell key="date" columnIndex={columnIndex}>{row.date ? row.date.split("T")[0] : "-"}</DashboardListRowCell>,
      unit: (columnIndex) => <DashboardListRowCell key="unit" columnIndex={columnIndex}>{row.unitText || "-"}</DashboardListRowCell>,
      unitType: (columnIndex) => <DashboardListRowCell key="unitType" columnIndex={columnIndex}>{row.unitType || "-"}</DashboardListRowCell>,
      vacancy: (columnIndex) => <DashboardListRowCell key="vacancy" columnIndex={columnIndex}>{row.vacancy || "-"}</DashboardListRowCell>,
      instructions: (columnIndex) => <DashboardListRowCell key="instructions" columnIndex={columnIndex}>{row.instructions || "-"}</DashboardListRowCell>,
      notes: (columnIndex) => <DashboardListRowCell key="notes" columnIndex={columnIndex}>{row.notes || "-"}</DashboardListRowCell>,
      items: (columnIndex) => <DashboardListRowCell key="items" columnIndex={columnIndex}>{row.itemsCount}</DashboardListRowCell>,
      delete: (columnIndex) => (
        <DashboardListRowCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => void controller.deleteWorkOrder(row.id)} disabled={controller.deletingId === row.id}>
            {controller.deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardListRowCell>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Edit work order ${row.workOrderNumber}`} onClick={() => workOrderNavigation.openRecord(row.id)}>
        {renderDashboardRowCells(visibleWorkOrderColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <>
      <DashboardListPageScaffold
        title={<DashboardCardTitle>Work Orders</DashboardCardTitle>}
        controls={
          <DashboardListPageControls
            count={filteredWorkOrders.length}
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            searchPlaceholder="Search property"
            isAscendingSort={isAscendingSort}
            onToggleSort={onToggleSort}
            ascendingSortLabel="1-9"
            descendingSortLabel="9-1"
            filtersSlot={<TableFilterControls groups={filterGroups} panelKey="work-orders-main-filters" />}
            columnSettingsSlot={
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
            }
            secondaryActions={
              <button
                type="button"
                onClick={controller.openSyncModal}
                className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-500/20"
              >
                Sync Template
              </button>
            }
            primaryAction={
              <button type="button" onClick={controller.openCreateModal} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
                <Plus size={16} />
                Work Order
              </button>
            }
          />
        }
        notices={
          !controller.isCreateModalOpen && !controller.isSyncModalOpen ? (
            <FormStatusNotices message={controller.notices.message} error={controller.notices.error} />
          ) : null
        }
        table={
          <DashboardListPageTable minWidthClass="min-w-[1280px]" columns={visibleWorkOrderColumns}>
            {isGroupingEnabled
              ? renderGroupedTableRows({
                  groups: groupedWorkOrders,
                  colSpan: visibleWorkOrderColumns.length,
                  renderRow: renderWorkOrderRow,
                })
              : sortedWorkOrders.map((row) => renderWorkOrderRow(row))}
            {filteredWorkOrders.length === 0 ? <TableEmptyRow message="No work orders yet." colSpan={visibleWorkOrderColumns.length} /> : null}
          </DashboardListPageTable>
        }
        pagination={
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
        }
      />

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
    </>
  )
}
