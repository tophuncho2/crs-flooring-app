"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/flooring/shared/display/accent-styles"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardTitle } from "@/features/flooring/shared/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/flooring/shared/feedback/notices"
import { useCanonicalDetailNavigation } from "@/features/flooring/shared/record-page/use-canonical-detail-navigation"
import { TableColumnSettings } from "@/features/flooring/shared/table/table-column-settings"
import TableControlsBar from "@/features/flooring/shared/table/table-controls-bar"
import { TableActionsSummary, TablePaginationControls } from "@/features/flooring/shared/table/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/table/use-configured-table-state"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/table/use-table-controls"
import type { ServiceRow, UnitOption } from "../../domain/types"
import { useServicesListController } from "../../controllers/use-services-list-controller"
import { ServicesCreateModal } from "./services-create-modal"
import { ServicesTable } from "./services-table"

export default function ServicesClient({
  initialServices,
  unitOptions,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
}: {
  initialServices: ServiceRow[]
  unitOptions: UnitOption[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: {
    searchQuery: string
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
  }
}) {
  const controller = useServicesListController(initialServices)
  const navigation = useCanonicalDetailNavigation("/dashboard/flooring/services")
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
    tableKey: "services-main",
    fields: [
      { key: "name", label: "Service Name", getValue: (row) => row.name, groupable: false },
      { key: "unit", label: "Unit", getValue: (row) => row.unitName, groupable: true },
      { key: "cost", label: "Cost", getValue: (row) => row.baseCost, groupable: false },
      { key: "notes", label: "Notes", getValue: (row) => row.notes, groupable: false },
      { key: "usage", label: "Usage", getValue: (row) => String(row.usageCount), groupable: false },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
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
            <DashboardCardTitle>Services</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredRows.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              searchPlaceholder="Search service"
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
              <button type="button" onClick={controller.openCreateModal} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
                <Plus size={16} />
                Service
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {!controller.isCreateModalOpen ? (
          <FormStatusNotices message={controller.notices.message} error={controller.notices.error} className="mt-3" />
        ) : null}

        <ServicesTable
          rows={sortedRows}
          visibleColumns={visibleColumns}
          groupedRows={groupedRowTree as GroupedRowTree<ServiceRow>[]}
          isGroupingEnabled={isGroupingEnabled}
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
        <ServicesCreateModal
          draft={controller.createDraft}
          unitOptions={unitOptions}
          message={controller.notices.message}
          error={controller.notices.error}
          isSaving={controller.isSavingCreate}
          onClose={controller.closeCreateModal}
          onFieldChange={controller.updateCreateDraft}
          onCreate={() => {
            void controller.submitCreate()
          }}
        />
      ) : null}
    </div>
  )
}
