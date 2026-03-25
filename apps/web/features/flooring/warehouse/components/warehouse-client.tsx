"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/flooring/shared/ui/display/accent-styles"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardTitle } from "@/features/flooring/shared/ui/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { TableColumnSettings } from "@/features/flooring/shared/ui/table/table-column-settings"
import TableControlsBar from "@/features/flooring/shared/ui/table/table-controls-bar"
import { TableActionsSummary, TablePaginationControls } from "@/features/flooring/shared/ui/table/table-shell"
import { useCanonicalDetailNavigation } from "@/features/flooring/shared/controllers/navigation/use-canonical-detail-navigation"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import { useWarehouseClientController } from "../use-warehouse-client-controller"
import type { WarehouseRow } from "../types"
import { WarehouseCreateModal } from "./warehouse-create-modal"
import { WarehouseTable } from "./warehouse-table"

export type { WarehouseRow } from "../types"

export default function WarehouseClient({
  initialRows,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
}: {
  initialRows: WarehouseRow[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState?: {
    searchQuery: string
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
  }
}) {
  const controller = useWarehouseClientController(initialRows)
  const warehouseNavigation = useCanonicalDetailNavigation("/dashboard/flooring/warehouse")
  const {
    searchQuery,
    isAscendingSort,
    isGroupingEnabled,
    groupByKeys,
    filteredRows,
    sortedRows,
    groupedRowTree,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    allColumns,
    visibleColumns,
    hiddenColumnKeys,
    toggleColumnVisibility,
    moveColumn,
    setColumnOrder,
    onSearchQueryChange,
    onToggleSort,
    onToggleGroupedColumn,
  } = useConfiguredTableState({
    rows: controller.rows,
    tableKey: "warehouse-main",
    fields: [
      { key: "name", label: "Warehouse", getValue: (row) => row.name, groupable: false },
      { key: "address", label: "Address", getValue: (row) => row.address ?? "", groupable: true },
      { key: "phone", label: "Store Phone", getValue: (row) => row.phone ?? "", groupable: true },
      { key: "sections", label: "Sections", getValue: (row) => String(row.sectionsCount), groupable: true },
      { key: "locations", label: "Locations", getValue: (row) => String(row.locationsCount), groupable: true },
      { key: "workOrders", label: "Work Orders", getValue: (row) => String(row.workOrdersCount), groupable: true },
    ],
    sortField: (row) => row.name,
    sortFieldKey: "name",
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    urlSyncMode: "history",
    initialPreferences: initialTablePreferences,
  })

  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <DashboardCardTitle>Warehouse</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredRows.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              searchPlaceholder="Search warehouse, address, or phone"
              isAscendingSort={isAscendingSort}
              onToggleSort={onToggleSort}
            >
              <TableColumnSettings
                columns={allColumns}
                hiddenColumnKeys={hiddenColumnKeys}
                onToggleColumn={toggleColumnVisibility}
                onMoveColumn={moveColumn}
                onSetColumnOrder={setColumnOrder}
                groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                maxGroupFields={MAX_GROUP_FIELDS}
                onToggleGroupedColumn={onToggleGroupedColumn}
              />
              <button
                onClick={() => controller.setIsCreating(true)}
                type="button"
                className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
              >
                <Plus size={16} />
                Add Warehouse
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {!controller.isCreating ? (
          <FormStatusNotices message={controller.message} error={controller.error} className="mt-3" />
        ) : null}

        <WarehouseTable
          rows={sortedRows}
          visibleColumns={visibleColumns}
          groupedRows={groupedRowTree as GroupedRowTree<WarehouseRow>[]}
          isGroupingEnabled={isGroupingEnabled}
          onOpen={(row) => warehouseNavigation.openRecord(row.id)}
        />

        <TablePaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
        />
      </section>

      {controller.isCreating ? (
        <WarehouseCreateModal
          draft={controller.createDraft}
          error={controller.error}
          onClose={() => {
            if (controller.isSaving) {
              return
            }

            controller.setIsCreating(false)
          }}
          onFieldChange={controller.updateCreateDraft}
          onCreate={async () => {
            const createdWarehouse = await controller.createWarehouse()
            if (createdWarehouse) {
              warehouseNavigation.openRecord(createdWarehouse.id)
            }
          }}
        />
      ) : null}
    </div>
  )
}
