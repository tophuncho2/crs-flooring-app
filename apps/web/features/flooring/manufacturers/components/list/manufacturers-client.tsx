"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/dashboard/shared/display/accent-styles"
import { DashboardCardTitle } from "@/features/dashboard/shared/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { DashboardListPageControls } from "@/features/dashboard/shared/list-page/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/features/dashboard/shared/list-page/dashboard-list-page-scaffold"
import { TableColumnSettings } from "@/features/dashboard/shared/table/table-column-settings"
import { TablePaginationControls } from "@/features/dashboard/shared/table/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import { useRecordEntryNavigation } from "@/features/shared/engines/common/record-entry"
import type { ManufacturerRow } from "../../domain/types"
import { useManufacturersListController } from "../../controllers/use-manufacturers-list-controller"
import { ManufacturersTable } from "./manufacturers-table"

export default function ManufacturersClient({
  initialManufacturers,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
}: {
  initialManufacturers: ManufacturerRow[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: {
    searchQuery: string
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
  }
}) {
  const controller = useManufacturersListController(initialManufacturers)
  const navigation = useRecordEntryNavigation("/dashboard/flooring/manufacturers")
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
    tableKey: "manufacturers-main",
    fields: [
      { key: "companyName", label: "Company Name", getValue: (row) => row.companyName || "No company", groupable: true },
      { key: "agentName", label: "Agent Name", getValue: (row) => row.agentName || "No agent", groupable: false },
      { key: "website", label: "Website", getValue: (row) => row.website, groupable: false },
      { key: "phone", label: "Phone", getValue: (row) => row.phone, groupable: false },
      { key: "email", label: "Email", getValue: (row) => row.email, groupable: false },
    ],
    sortField: (row) => row.companyName || row.agentName,
    sortFieldKey: "companyName",
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
        title={<DashboardCardTitle>Manufacturers</DashboardCardTitle>}
        controls={
          <DashboardListPageControls
            count={filteredRows.length}
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            searchPlaceholder="Search manufacturer"
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
              <button type="button" onClick={() => navigation.openCreate()} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
                <Plus size={16} />
                Manufacturer
              </button>
            }
          />
        }
        notices={<FormStatusNotices message={controller.notices.message} error={controller.notices.error} />}
        table={
          <ManufacturersTable
            rows={sortedRows}
            visibleColumns={visibleColumns}
            groupedRows={groupedRowTree as GroupedRowTree<ManufacturerRow>[]}
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
