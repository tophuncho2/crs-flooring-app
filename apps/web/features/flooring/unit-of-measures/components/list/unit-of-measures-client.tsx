"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/dashboard/shared/display/accent-styles"
import { DashboardCardTitle } from "@/features/dashboard/shared/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { DashboardListPageControls } from "@/features/dashboard/shared/list-page/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/features/dashboard/shared/list-page/dashboard-list-page-scaffold"
import { TableColumnSettings } from "@/features/dashboard/shared/table/table-column-settings"
import { TablePaginationControls } from "@/features/dashboard/shared/table/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/table/use-configured-table-state"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import { type GroupedRowTree, MAX_GROUP_FIELDS } from "@/features/flooring/shared/table/use-table-controls"
import { useRecordEntryNavigation } from "@/features/shared/engines/common/record-entry"
import type { UnitOfMeasureRow } from "../../domain/types"
import { useUnitOfMeasuresListController } from "../../controllers/use-unit-of-measures-list-controller"
import { UnitOfMeasuresTable } from "./unit-of-measures-table"

export default function UnitOfMeasuresClient({
  canManage,
  initialUnitOfMeasures,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
}: {
  canManage: boolean
  initialUnitOfMeasures: UnitOfMeasureRow[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: {
    searchQuery: string
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
  }
}) {
  const controller = useUnitOfMeasuresListController(initialUnitOfMeasures)
  const navigation = useRecordEntryNavigation("/dashboard/flooring/unit-of-measures")
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
    tableKey: "unit-of-measures-main",
    fields: [
      { key: "name", label: "Unit Of Measure", getValue: (row) => row.name, groupable: true },
      { key: "createdAt", label: "Created", getValue: (row) => row.createdAt, groupable: false },
      ...(canManage ? [{ key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false } as const] : []),
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
        title={<DashboardCardTitle>Unit Of Measures</DashboardCardTitle>}
        controls={
          <DashboardListPageControls
            count={filteredRows.length}
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            searchPlaceholder="Search unit of measure"
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
            primaryAction={canManage ? (
              <button
                type="button"
                onClick={() => navigation.openCreate()}
                className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
              >
                <Plus size={16} />
                Unit Of Measure
              </button>
            ) : undefined}
          />
        }
        notices={<FormStatusNotices message={controller.notices.message} error={controller.notices.error} />}
        table={
          <UnitOfMeasuresTable
            rows={sortedRows}
            visibleColumns={visibleColumns}
            groupedRows={groupedRowTree as GroupedRowTree<UnitOfMeasureRow>[]}
            isGroupingEnabled={isGroupingEnabled}
            canManage={canManage}
            deletingId={controller.deletingId}
            onOpen={(row) => navigation.openRecord(row.id)}
            onDelete={(row) => void controller.removeRow(row)}
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
