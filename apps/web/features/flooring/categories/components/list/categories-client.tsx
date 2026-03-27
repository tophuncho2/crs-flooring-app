"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/flooring/shared/display/accent-styles"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardTitle } from "@/features/flooring/shared/display/dashboard-card-title"
import { DashboardTableSurface } from "@/features/flooring/shared/display/dashboard-table-surface"
import { FormStatusNotices } from "@/features/flooring/shared/feedback/notices"
import { useCanonicalDetailNavigation } from "@/features/flooring/shared/record-page/use-canonical-detail-navigation"
import { TableColumnSettings } from "@/features/flooring/shared/table/table-column-settings"
import TableControlsBar from "@/features/flooring/shared/table/table-controls-bar"
import { TableActionsSummary, TablePaginationControls } from "@/features/flooring/shared/table/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/table/use-configured-table-state"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/table/use-table-controls"
import { useCategoriesListController } from "../../controllers/use-categories-list-controller"
import type { CategoryRow, UnitOfMeasureOption } from "../../domain/types"
import { CategoriesCreateModal } from "./categories-create-modal"
import { CategoriesTable } from "./categories-table"

export default function CategoriesClient({
  canManage,
  initialCategories,
  unitOfMeasureOptions,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
}: {
  canManage: boolean
  initialCategories: CategoryRow[]
  unitOfMeasureOptions: UnitOfMeasureOption[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: {
    searchQuery: string
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
  }
}) {
  const controller = useCategoriesListController(initialCategories)
  const navigation = useCanonicalDetailNavigation("/dashboard/flooring/categories")
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
    tableKey: "categories-main",
    fields: [
      { key: "name", label: "Category", getValue: (row) => row.name, groupable: false },
      { key: "sendUnit", label: "Send Unit", getValue: (row) => row.sendUnit, groupable: true },
      { key: "stockUnit", label: "Stock Unit", getValue: (row) => row.stockUnit, groupable: true },
      { key: "coverageAvailableUnit", label: "Coverage Available Unit", getValue: (row) => row.coverageAvailableUnit, groupable: true },
      { key: "itemCoverageUnit", label: "Item Coverage Unit", getValue: (row) => row.itemCoverageUnit, groupable: true },
      { key: "serviceUnit", label: "Service Unit", getValue: (row) => row.serviceUnit, groupable: true },
      { key: "products", label: "Products", getValue: (row) => String(row.productCount), groupable: false },
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
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <DashboardTableSurface
        title={<DashboardCardTitle>Categories</DashboardCardTitle>}
        actions={
          <TableActionsSummary count={filteredRows.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              searchPlaceholder="Search category"
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
              {canManage ? (
                <button type="button" onClick={controller.openCreateModal} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
                  <Plus size={16} />
                  Category
                </button>
              ) : null}
            </TableControlsBar>
          </TableActionsSummary>
        }
        notices={
          !controller.isCreateModalOpen ? (
            <FormStatusNotices message={controller.notices.message} error={controller.notices.error} />
          ) : null
        }
      >
        <CategoriesTable
          rows={sortedRows}
          visibleColumns={visibleColumns}
          groupedRows={groupedRowTree as GroupedRowTree<CategoryRow>[]}
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
      </DashboardTableSurface>

      {controller.isCreateModalOpen ? (
        <CategoriesCreateModal
          draft={controller.createDraft}
          unitOfMeasureOptions={unitOfMeasureOptions}
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
