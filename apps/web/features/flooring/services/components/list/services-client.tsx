"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/dashboard/shared/display/accent-styles"
import { DashboardCardTitle } from "@/features/dashboard/shared/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { DashboardListPageControls } from "@/features/dashboard/shared/list-page/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/features/dashboard/shared/list-page/dashboard-list-page-scaffold"
import { useCanonicalDetailNavigation } from "@/features/dashboard/shared/navigation/use-canonical-detail-navigation"
import { TableColumnSettings } from "@/features/dashboard/shared/table/table-column-settings"
import { TablePaginationControls } from "@/features/dashboard/shared/table/table-shell"
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
    <>
      <DashboardListPageScaffold
        title={<DashboardCardTitle>Services</DashboardCardTitle>}
        controls={
          <DashboardListPageControls
            count={filteredRows.length}
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            searchPlaceholder="Search service"
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
              <button type="button" onClick={controller.openCreateModal} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
                <Plus size={16} />
                Service
              </button>
            }
          />
        }
        notices={!controller.isCreateModalOpen ? <FormStatusNotices message={controller.notices.message} error={controller.notices.error} /> : null}
        table={
          <ServicesTable
            rows={sortedRows}
            visibleColumns={visibleColumns}
            groupedRows={groupedRowTree as GroupedRowTree<ServiceRow>[]}
            isGroupingEnabled={isGroupingEnabled}
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
    </>
  )
}
