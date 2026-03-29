"use client"

import { type ReactNode } from "react"
import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/dashboard/shared/display/accent-styles"
import { DashboardCardTitle } from "@/features/dashboard/shared/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { useCanonicalDetailNavigation } from "@/features/dashboard/shared/navigation/use-canonical-detail-navigation"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { TableColumnSettings } from "@/features/dashboard/shared/table/table-column-settings"
import {
  ClickableTableRow,
  TableEmptyRow,
  TablePaginationControls,
} from "@/features/dashboard/shared/table/table-shell"
import { renderGroupedTableRows } from "@/features/dashboard/shared/table/render-grouped-table-rows"
import { useConfiguredTableState } from "@/features/flooring/shared/use-configured-table-state"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/use-table-controls"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import {
  DashboardListPageControls,
  DashboardListPageScaffold,
  DashboardListPageTable,
  DashboardListRowCell,
  renderDashboardRowCells,
} from "@/features/shared/engines/dashboard-view"
import type { PadProductOption, PropertyOption, ServerPaginationState, ServerTableState, TemplateRow, WarehouseOption } from "../types"
import { useTemplatesClientController } from "./use-templates-client-controller"
import { TemplateCreateModal } from "../components/template-create-modal"

export default function TemplatesClient({
  initialTemplates,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  initialTablePreferences,
  tableState,
  pagination,
}: {
  initialTemplates: TemplateRow[]
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: ServerTableState
  pagination?: ServerPaginationState
}) {
  const controller = useTemplatesClientController(initialTemplates)
  const templateNavigation = useCanonicalDetailNavigation("/dashboard/flooring/templates")
  const {
    searchQuery,
    isAscendingSort,
    isGroupingEnabled,
    groupByKeys,
    filteredRows: filteredTemplates,
    sortedRows: sortedTemplates,
    groupedRowTree: groupedTemplates,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    allColumns: orderedTemplateColumns,
    visibleColumns: visibleTemplateColumns,
    hiddenColumnKeys: hiddenTemplateColumnKeys,
    toggleColumnVisibility: toggleTemplateColumnVisibility,
    moveColumn: moveTemplateColumn,
    setColumnOrder: setTemplateColumnOrder,
    onSearchQueryChange,
    onToggleSort,
    onToggleGroupedColumn,
  } = useConfiguredTableState({
    rows: controller.rows,
    tableKey: "templates-main",
    fields: [
      { key: "templateNumber", label: "Template #", getValue: (row) => row.templateNumber, groupable: false },
      { key: "templateTag", label: "Template Tag", getValue: (row) => row.templateTag, groupable: true },
      { key: "property", label: "Property", getValue: (row) => row.propertyName, groupable: true },
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.warehouseName, groupable: true },
      { key: "instructions", label: "Instructions", getValue: (row) => row.instructions, groupable: false },
      { key: "padType", label: "Pad Type", getValue: (row) => row.padTypeLabel, groupable: true },
      { key: "templateNotes", label: "Template Notes", getValue: (row) => row.templateNotes, groupable: false },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => `${row.propertyName} ${row.templateTag}`,
    sortFieldKey: "templateTag",
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    urlSyncMode: "router",
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
    initialPreferences: initialTablePreferences,
  })

  function renderTemplateRow(row: TemplateRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      templateNumber: (columnIndex) => (
        <DashboardListRowCell key="templateNumber" columnIndex={columnIndex} className="font-medium text-blue-500">
          {row.templateNumber}
        </DashboardListRowCell>
      ),
      templateTag: (columnIndex) => <DashboardListRowCell key="templateTag" columnIndex={columnIndex}>{row.templateTag}</DashboardListRowCell>,
      property: (columnIndex) => <DashboardListRowCell key="property" columnIndex={columnIndex}>{row.propertyName}</DashboardListRowCell>,
      warehouse: (columnIndex) => <DashboardListRowCell key="warehouse" columnIndex={columnIndex}>{row.warehouseName || "-"}</DashboardListRowCell>,
      instructions: (columnIndex) => <DashboardListRowCell key="instructions" columnIndex={columnIndex}>{row.instructions || "-"}</DashboardListRowCell>,
      padType: (columnIndex) => <DashboardListRowCell key="padType" columnIndex={columnIndex}>{row.padTypeLabel || "-"}</DashboardListRowCell>,
      templateNotes: (columnIndex) => <DashboardListRowCell key="templateNotes" columnIndex={columnIndex}>{row.templateNotes || "-"}</DashboardListRowCell>,
      delete: (columnIndex) => (
        <DashboardListRowCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => void controller.deleteTemplate(row.id)} disabled={controller.deletingId === row.id}>
            {controller.deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardListRowCell>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Edit template ${row.templateNumber}`} onClick={() => templateNavigation.openRecord(row.id)}>
        {renderDashboardRowCells(visibleTemplateColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <>
      <DashboardListPageScaffold
        title={<DashboardCardTitle>Templates</DashboardCardTitle>}
        controls={
          <DashboardListPageControls
            count={filteredTemplates.length}
            searchQuery={searchQuery}
            onSearchQueryChange={onSearchQueryChange}
            searchPlaceholder="Search property"
            isAscendingSort={isAscendingSort}
            onToggleSort={onToggleSort}
            columnSettingsSlot={
              <TableColumnSettings
                columns={orderedTemplateColumns}
                hiddenColumnKeys={hiddenTemplateColumnKeys}
                onToggleColumn={toggleTemplateColumnVisibility}
                onMoveColumn={moveTemplateColumn}
                onSetColumnOrder={setTemplateColumnOrder}
                groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                maxGroupFields={MAX_GROUP_FIELDS}
                onToggleGroupedColumn={onToggleGroupedColumn}
              />
            }
            primaryAction={
              <button
                type="button"
                onClick={controller.openCreateModal}
                className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
              >
                <Plus size={16} />
                Template
              </button>
            }
          />
        }
        notices={
          !controller.isCreateModalOpen ? (
            <FormStatusNotices message={controller.notices.message} error={controller.notices.error} />
          ) : null
        }
        table={
          <DashboardListPageTable minWidthClass="min-w-[1260px]" columns={visibleTemplateColumns}>
            {isGroupingEnabled
              ? renderGroupedTableRows({
                  groups: groupedTemplates as GroupedRowTree<TemplateRow>[],
                  colSpan: visibleTemplateColumns.length,
                  renderRow: renderTemplateRow,
                })
              : sortedTemplates.map((row) => renderTemplateRow(row))}

            {filteredTemplates.length === 0 ? <TableEmptyRow message="No templates found." colSpan={visibleTemplateColumns.length} /> : null}
          </DashboardListPageTable>
        }
        pagination={
          <TablePaginationControls
            page={pagination?.page ?? page}
            totalPages={pagination?.totalPages ?? totalPages}
            pageSize={pagination?.pageSize ?? pageSize}
            totalItems={pagination?.totalItems ?? filteredTemplates.length}
            hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
            hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
            onPreviousPage={pagination ? undefined : goToPreviousPage}
            onNextPage={pagination ? undefined : goToNextPage}
            previousPageHref={pagination?.previousPageHref}
            nextPageHref={pagination?.nextPageHref}
          />
        }
      />

      {controller.isCreateModalOpen ? (
        <TemplateCreateModal
          draft={controller.createDraft}
          propertyOptions={propertyOptions}
          warehouseOptions={warehouseOptions}
          padProductOptions={padProductOptions}
          message={controller.notices.message}
          error={controller.notices.error}
          isSaving={controller.isSavingCreate}
          onClose={controller.closeCreateModal}
          onFieldChange={controller.updateCreateDraft}
          onCreate={async () => {
            const createdTemplate = await controller.createTemplate()
            if (createdTemplate) {
              templateNavigation.openRecord(createdTemplate.id)
            }
          }}
        />
      ) : null}
    </>
  )
}
