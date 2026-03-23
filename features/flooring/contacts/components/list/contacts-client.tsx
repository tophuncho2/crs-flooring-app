"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/flooring/shared/ui/display/accent-styles"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardTitle } from "@/features/flooring/shared/ui/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { useCanonicalDetailNavigation } from "@/features/flooring/shared/controllers/navigation/use-canonical-detail-navigation"
import { TableColumnSettings } from "@/features/flooring/shared/ui/table/table-column-settings"
import TableControlsBar from "@/features/flooring/shared/ui/table/table-controls-bar"
import { TableActionsSummary, TablePaginationControls } from "@/features/flooring/shared/ui/table/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import type { ContactRow } from "../../domain/types"
import { useContactsListController } from "../../controllers/use-contacts-list-controller"
import { ContactsCreateModal } from "./contacts-create-modal"
import { ContactsTable } from "./contacts-table"

export default function ContactsClient({
  initialContacts,
}: {
  initialContacts: ContactRow[]
}) {
  const controller = useContactsListController(initialContacts)
  const navigation = useCanonicalDetailNavigation("/dashboard/flooring/contacts")
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
    tableKey: "contacts-main",
    fields: [
      { key: "name", label: "Contact Name", getValue: (row) => row.name, groupable: false },
      { key: "type", label: "Type", getValue: (row) => row.typeLabel, groupable: true },
      { key: "assignments", label: "Assignments", getValue: (row) => String(row.assignmentsCount), groupable: false },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => row.name,
    defaultGroupKeys: ["type"],
  })

  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <DashboardCardTitle>Contacts</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredRows.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchPlaceholder="Search contact"
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
              <button type="button" onClick={controller.openCreateModal} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
                <Plus size={16} />
                Contact
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {!controller.isCreateModalOpen ? (
          <FormStatusNotices message={controller.notices.message} error={controller.notices.error} className="mt-3" />
        ) : null}

        <ContactsTable
          rows={sortedRows}
          visibleColumns={visibleColumns}
          groupedRows={groupedRowTree as GroupedRowTree<ContactRow>[]}
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
        <ContactsCreateModal
          draft={controller.createDraft}
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
