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
import type { ContactRow } from "../../domain/types"
import { useContactsListController } from "../../controllers/use-contacts-list-controller"
import { ContactsTable } from "./contacts-table"

export default function ContactsClient({
  initialContacts,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
}: {
  initialContacts: ContactRow[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: {
    searchQuery: string
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
  }
}) {
  const controller = useContactsListController(initialContacts)
  const navigation = useRecordEntryNavigation("/dashboard/flooring/contacts")
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
    tableKey: "contacts-main",
    fields: [
      { key: "name", label: "Contact Name", getValue: (row) => row.name, groupable: false },
      { key: "type", label: "Type", getValue: (row) => row.typeLabel, groupable: true },
      { key: "assignments", label: "Assignments", getValue: (row) => String(row.assignmentsCount), groupable: false },
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
        title={<DashboardCardTitle>Contacts</DashboardCardTitle>}
        controls={
          <DashboardListPageControls
            count={filteredRows.length}
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            searchPlaceholder="Search contact"
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
                Contact
              </button>
            }
          />
        }
        notices={<FormStatusNotices message={controller.notices.message} error={controller.notices.error} />}
        table={
          <ContactsTable
            rows={sortedRows}
            visibleColumns={visibleColumns}
            groupedRows={groupedRowTree as GroupedRowTree<ContactRow>[]}
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
