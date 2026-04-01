"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/dashboard/shared/display/accent-styles"
import { DashboardCardTitle } from "@/features/dashboard/shared/display/dashboard-card-title"
import { DashboardListPageScaffold } from "@/features/dashboard/shared/list-page/dashboard-list-page-scaffold"
import { TableActionsSummary, TablePaginationControls } from "@/features/dashboard/shared/table/table-shell"
import { useRecordEntryNavigation } from "@/features/shared/engines/common/record-entry"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import type { GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
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
    isAscendingSort,
    isGroupingEnabled,
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
    visibleColumns,
    onToggleSort,
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
          <TableActionsSummary count={filteredRows.length}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onToggleSort}
                className={[
                  "inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition",
                  isAscendingSort
                    ? "border-blue-500 text-blue-500"
                    : "border-[var(--panel-border)] text-[var(--foreground)] hover:bg-[var(--panel-hover)]",
                ].join(" ")}
              >
                {isAscendingSort ? "A-Z" : "Z-A"}
              </button>
              <button
                onClick={() => warehouseNavigation.openCreate()}
                type="button"
                className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
              >
                <Plus size={16} />
                Add Warehouse
              </button>
            </div>
          </TableActionsSummary>
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
