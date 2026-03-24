"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/flooring/shared/display/accent-styles"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardTitle } from "@/features/flooring/shared/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/flooring/shared/feedback/notices"
import { useCanonicalDetailNavigation } from "@/features/flooring/shared/record-page/use-canonical-detail-navigation"
import { TableColumnSettings } from "@/features/flooring/shared/table/table-column-settings"
import TableControlsBar from "@/features/flooring/shared/table/table-controls-bar"
import {
  TableActionsSummary,
  TablePaginationControls,
} from "@/features/flooring/shared/table/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/table/use-configured-table-state"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import { type GroupedRowTree, MAX_GROUP_FIELDS } from "@/features/flooring/shared/table/use-table-controls"
import type { UnitOfMeasureRow } from "../../domain/types"
import { useUnitOfMeasuresListController } from "../../controllers/use-unit-of-measures-list-controller"
import { UnitOfMeasuresCreateModal } from "./unit-of-measures-create-modal"
import { UnitOfMeasuresTable } from "./unit-of-measures-table"

export default function UnitOfMeasuresClient({
  canManage,
  initialUnitOfMeasures,
  initialTablePreferences,
}: {
  canManage: boolean
  initialUnitOfMeasures: UnitOfMeasureRow[]
  initialTablePreferences?: TablePreferencePayload | null
}) {
  const controller = useUnitOfMeasuresListController(initialUnitOfMeasures)
  const navigation = useCanonicalDetailNavigation("/dashboard/flooring/unit-of-measures")
  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    groupByKeys,
    toggleGroupByKey,
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
  } = useConfiguredTableState({
    rows: controller.rows,
    tableKey: "unit-of-measures-main",
    fields: [
      { key: "name", label: "Unit Of Measure", getValue: (row) => row.name, groupable: true },
      { key: "createdAt", label: "Created", getValue: (row) => row.createdAt, groupable: false },
      ...(canManage ? [{ key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false } as const] : []),
    ],
    sortField: (row) => row.name,
    defaultGroupKeys: ["name"],
    initialPreferences: initialTablePreferences,
  })

  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <DashboardCardTitle>Unit Of Measures</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredRows.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchPlaceholder="Search unit of measure"
              isAscendingSort={isAscendingSort}
              onToggleSort={() => setIsAscendingSort((previous) => !previous)}
            >
              <TableColumnSettings
                columns={allColumns}
                hiddenColumnKeys={hiddenColumnKeys}
                onToggleColumn={toggleColumnVisibility}
                onMoveColumn={moveColumn}
                onSetColumnOrder={setColumnOrder}
                groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                maxGroupFields={MAX_GROUP_FIELDS}
                onToggleGroupedColumn={toggleGroupByKey}
              />
              {canManage ? (
                <button
                  type="button"
                  onClick={controller.openCreateModal}
                  className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
                >
                  <Plus size={16} />
                  Unit Of Measure
                </button>
              ) : null}
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {!controller.isCreateModalOpen ? (
          <FormStatusNotices message={controller.notices.message} error={controller.notices.error} className="mt-3" />
        ) : null}

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

      {controller.isCreateModalOpen ? (
        <UnitOfMeasuresCreateModal
          name={controller.createDraft.name}
          message={controller.notices.message}
          error={controller.notices.error}
          isSaving={controller.isSavingCreate}
          onClose={controller.closeCreateModal}
          onNameChange={controller.updateCreateDraft}
          onCreate={() => {
            void controller.submitCreate()
          }}
        />
      ) : null}
    </div>
  )
}
