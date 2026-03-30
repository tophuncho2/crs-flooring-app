"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/dashboard/shared/display/accent-styles"
import { DashboardCardTitle } from "@/features/dashboard/shared/display/dashboard-card-title"
import { DashboardListPageControls } from "@/features/dashboard/shared/list-page/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/features/dashboard/shared/list-page/dashboard-list-page-scaffold"
import { TableColumnSettings } from "@/features/dashboard/shared/table/table-column-settings"
import { TablePaginationControls } from "@/features/dashboard/shared/table/table-shell"
import { useRecordEntryNavigation } from "@/features/shared/engines/common/record-entry"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import type { WarehouseRow } from "../types"
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
  const warehouseNavigation = useRecordEntryNavigation("/dashboard/flooring/warehouse")
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
    rows: initialRows,
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
    <>
      <DashboardListPageScaffold
        title={<DashboardCardTitle>Warehouse</DashboardCardTitle>}
        controls={
          <DashboardListPageControls
            count={filteredRows.length}
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            searchPlaceholder="Search warehouse, address, or phone"
            isAscendingSort={isAscendingSort}
            onToggleSort={onToggleSort}
            columnSettingsSlot={
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
            }
            primaryAction={
              <button
                onClick={() => warehouseNavigation.openCreate()}
                type="button"
                className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
              >
                <Plus size={16} />
                Add Warehouse
              </button>
            }
          />
        }
        table={
          <WarehouseTable
            rows={sortedRows}
            visibleColumns={visibleColumns}
            groupedRows={groupedRowTree as GroupedRowTree<WarehouseRow>[]}
            isGroupingEnabled={isGroupingEnabled}
            onOpen={(row) => warehouseNavigation.openRecord(row.id)}
          />
        }
        pagination={
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
        }
      />
    </>
  )
}
