"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME, FLOORING_PRIMARY_ACCENT_INTERACTIVE_CLASS_NAME } from "@/modules/shared/engines/common/display/accent-styles"
import { DashboardCardTitle } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { FormStatusNotices } from "@/modules/shared/engines/common/feedback/notices"
import { DashboardListPageScaffold } from "@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold"
import { TableActionsSummary, TablePaginationControls } from "@/modules/shared/engines/list-view/table/table-shell"
import { useConfiguredTableState } from "@/modules/shared/engines/list-view/controllers/use-configured-table-state"
import type { TablePreferencePayload } from "@/modules/shared/engines/list-view/controllers/table-preferences"
import { type GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import { useRecordEntryNavigation } from "@/modules/shared/engines/common/record-entry"
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
  const navigation = useRecordEntryNavigation("/dashboard/unit-of-measures")
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
    rows: controller.rows,
    tableKey: "unit-of-measures-main",
    fields: [
      { key: "name", label: "Unit Of Measure", getValue: (row) => row.name, groupable: true },
      { key: "createdAt", label: "Created", getValue: (row) => row.createdAt, groupable: false },
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
          <TableActionsSummary count={filteredRows.length}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onToggleSort}
                className={[
                  "inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition",
                  isAscendingSort
                    ? `border-blue-500 ${FLOORING_PRIMARY_ACCENT_INTERACTIVE_CLASS_NAME}`
                    : "border-[var(--panel-border)] text-[var(--foreground)] hover:bg-[var(--panel-hover)]",
                ].join(" ")}
              >
                {isAscendingSort ? "A-Z" : "Z-A"}
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => navigation.openCreate()}
                  className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
                >
                  <Plus size={16} />
                  Unit Of Measure
                </button>
              )}
            </div>
          </TableActionsSummary>
        }
        notices={<FormStatusNotices message={controller.notices.message} error={controller.notices.error} />}
        table={
          <UnitOfMeasuresTable
            rows={sortedRows}
            visibleColumns={visibleColumns}
            groupedRows={groupedRowTree as GroupedRowTree<UnitOfMeasureRow>[]}
            isGroupingEnabled={isGroupingEnabled}
            onOpen={(row) => navigation.openRecord(row.id)}
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
