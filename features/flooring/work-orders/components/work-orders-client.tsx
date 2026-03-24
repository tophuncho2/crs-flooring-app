"use client"

import { type ReactNode } from "react"
import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "../../shared/accent-styles"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardTitle } from "../../shared/dashboard-card-title"
import { FormStatusNotices } from "../../shared/ui/feedback/notices"
import { DeleteRowButton } from "../../shared/row-action-buttons"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import { ClickableTableRow, TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "../../shared/table-shell"
import { useCanonicalDetailNavigation } from "../../shared/use-canonical-detail-navigation"
import { useConfiguredTableState } from "../../shared/use-configured-table-state"
import { useServerTableQueryControls } from "../../shared/use-server-table-query-controls"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "../../shared/use-table-controls"
import { getWorkOrderStatusFieldClass, getWorkOrderStatusLabel } from "../contracts"
import type { PropertyOption, ServerPaginationState, ServerTableState, TemplateOption, WarehouseOption, WorkOrderRow } from "../types"
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
  tableState,
  pagination,
}: {
  initialWorkOrders: WorkOrderRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  templateOptions: TemplateOption[]
  tableState: ServerTableState
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
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupFields,
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
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })
  const serverTableControls = useServerTableQueryControls({
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupOptions: groupFields.map((field) => ({ key: field.key, label: field.label })),
  })

  function renderWorkOrderRow(row: WorkOrderRow) {
    const cells: Record<string, ReactNode> = {
      wo: <td key="wo" className="px-3 py-2 font-medium text-blue-500">{row.workOrderNumber}</td>,
      status: (
        <td key="status" className="px-3 py-2">
          {row.isComplete ? (
            <span className="inline-flex min-w-[110px] rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-center text-sm text-emerald-700">
              Complete
            </span>
          ) : (
            <span className={`inline-flex min-w-[110px] rounded border px-2 py-1 text-center text-sm ${getWorkOrderStatusFieldClass(row.status)}`}>
              {workOrderStatusText(row)}
            </span>
          )}
        </td>
      ),
      warehouse: <td key="warehouse" className="px-3 py-2">{row.warehouseName || "-"}</td>,
      property: <td key="property" className="px-3 py-2">{row.propertyName}</td>,
      address: <td key="address" className="px-3 py-2">{row.customAddress.trim() || row.propertyAddress || "-"}</td>,
      customAddress: <td key="customAddress" className="px-3 py-2">{row.customAddress || "-"}</td>,
      date: <td key="date" className="px-3 py-2">{row.date ? row.date.split("T")[0] : "-"}</td>,
      unit: <td key="unit" className="px-3 py-2">{row.unitText || "-"}</td>,
      unitType: <td key="unitType" className="px-3 py-2">{row.unitType || "-"}</td>,
      vacancy: <td key="vacancy" className="px-3 py-2">{row.vacancy || "-"}</td>,
      instructions: <td key="instructions" className="px-3 py-2">{row.instructions || "-"}</td>,
      notes: <td key="notes" className="px-3 py-2">{row.notes || "-"}</td>,
      items: <td key="items" className="px-3 py-2">{row.itemsCount}</td>,
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => void controller.deleteWorkOrder(row.id)} disabled={controller.deletingId === row.id}>
            {controller.deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Edit work order ${row.workOrderNumber}`} onClick={() => workOrderNavigation.openRecord(row.id)}>
        {visibleWorkOrderColumns.map((column) => cells[column.key])}
      </ClickableTableRow>
    )
  }

  function renderGroupedWorkOrders(groups: GroupedRowTree<WorkOrderRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow
        key={`${group.depth}-${group.key}`}
        label={`${group.fieldLabel}: ${group.label}`}
        depth={group.depth}
        colSpan={visibleWorkOrderColumns.length}
      />,
      ...(group.children.length > 0 ? renderGroupedWorkOrders(group.children) : group.rows.map((row) => renderWorkOrderRow(row))),
    ])
  }

  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <div className="w-full space-y-6">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <DashboardCardTitle>Work Orders</DashboardCardTitle>
            </div>
            <TableActionsSummary count={filteredWorkOrders.length}>
              <TableControlsBar
                searchQuery={searchQuery}
                onSearchQueryChange={serverTableControls.onSearchQueryChange}
                searchPlaceholder="Search property"
                isAscendingSort={isAscendingSort}
                onToggleSort={serverTableControls.onToggleSort}
                ascendingSortLabel="1-9"
                descendingSortLabel="9-1"
              >
                <TableColumnSettings
                  columns={orderedWorkOrderColumns}
                  hiddenColumnKeys={hiddenWorkOrderColumnKeys}
                  onToggleColumn={toggleWorkOrderColumnVisibility}
                  onMoveColumn={moveWorkOrderColumn}
                  onSetColumnOrder={setWorkOrderColumnOrder}
                  groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                  maxGroupFields={MAX_GROUP_FIELDS}
                  onToggleGroupedColumn={serverTableControls.onToggleGroupByKey}
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
          </div>

          {!controller.isCreateModalOpen && !controller.isSyncModalOpen ? (
            <FormStatusNotices message={controller.notices.message} error={controller.notices.error} className="mt-3" />
          ) : null}

          <TableShell minWidthClass="min-w-[1280px]">
            <TableHead>
              <tr>
                {visibleWorkOrderColumns.map((column) => (
                  <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
                ))}
              </tr>
            </TableHead>
            <tbody>
              {isGroupingEnabled
                ? renderGroupedWorkOrders(groupedWorkOrders)
                : sortedWorkOrders.map((row) => renderWorkOrderRow(row))}

              {filteredWorkOrders.length === 0 ? <TableEmptyRow message="No work orders yet." colSpan={visibleWorkOrderColumns.length} /> : null}
            </tbody>
          </TableShell>
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
        </section>
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
