"use client"

import { type ReactNode } from "react"
import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "../../shared/accent-styles"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardTitle } from "../../shared/dashboard-card-title"
import { DashboardTableSurface } from "../../shared/display/dashboard-table-surface"
import { FormStatusNotices } from "../../shared/ui/feedback/notices"
import { DeleteRowButton } from "../../shared/row-action-buttons"
import { TableColumnSettings } from "../../shared/table-column-settings"
import TableControlsBar from "../../shared/table-controls-bar"
import {
  ClickableTableRow,
  DashboardTableCell,
  EmbeddedPageTableShell,
  TableActionsSummary,
  TableEmptyRow,
  TableHead,
  TableHeaderCell,
  TablePaginationControls,
} from "../../shared/table-shell"
import { renderGroupedTableRows } from "../../shared/ui/table/render-grouped-table-rows"
import { useCanonicalDetailNavigation } from "../../shared/use-canonical-detail-navigation"
import { useConfiguredTableState } from "../../shared/use-configured-table-state"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "../../shared/use-table-controls"
import type { TablePreferencePayload } from "../../shared/controllers/table/table-preferences"
import type { PadProductOption, PropertyOption, ServerPaginationState, ServerTableState, TemplateRow, WarehouseOption } from "../types"
import { useTemplatesClientController } from "../use-templates-client-controller"
import { TemplateCreateModal } from "./template-create-modal"

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
        <DashboardTableCell key="templateNumber" columnIndex={columnIndex} className="font-medium text-blue-500">
          {row.templateNumber}
        </DashboardTableCell>
      ),
      templateTag: (columnIndex) => <DashboardTableCell key="templateTag" columnIndex={columnIndex}>{row.templateTag}</DashboardTableCell>,
      property: (columnIndex) => <DashboardTableCell key="property" columnIndex={columnIndex}>{row.propertyName}</DashboardTableCell>,
      warehouse: (columnIndex) => <DashboardTableCell key="warehouse" columnIndex={columnIndex}>{row.warehouseName || "-"}</DashboardTableCell>,
      instructions: (columnIndex) => <DashboardTableCell key="instructions" columnIndex={columnIndex}>{row.instructions || "-"}</DashboardTableCell>,
      padType: (columnIndex) => <DashboardTableCell key="padType" columnIndex={columnIndex}>{row.padTypeLabel || "-"}</DashboardTableCell>,
      templateNotes: (columnIndex) => <DashboardTableCell key="templateNotes" columnIndex={columnIndex}>{row.templateNotes || "-"}</DashboardTableCell>,
      delete: (columnIndex) => (
        <DashboardTableCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => void controller.deleteTemplate(row.id)} disabled={controller.deletingId === row.id}>
            {controller.deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardTableCell>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Edit template ${row.templateNumber}`} onClick={() => templateNavigation.openRecord(row.id)}>
        {visibleTemplateColumns.map((column, columnIndex) => cells[column.key](columnIndex))}
      </ClickableTableRow>
    )
  }

  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <DashboardTableSurface
        title={<DashboardCardTitle>Templates</DashboardCardTitle>}
        actions={
          <TableActionsSummary count={filteredTemplates.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              searchPlaceholder="Search property"
              isAscendingSort={isAscendingSort}
              onToggleSort={onToggleSort}
            >
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
              <button
                type="button"
                onClick={controller.openCreateModal}
                className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
              >
                <Plus size={16} />
                Template
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        }
        notices={
          !controller.isCreateModalOpen ? (
            <FormStatusNotices message={controller.notices.message} error={controller.notices.error} />
          ) : null
        }
      >
        <EmbeddedPageTableShell minWidthClass="min-w-[1260px]">
            <TableHead>
              <tr>
                {visibleTemplateColumns.map((column) => (
                  <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
                ))}
              </tr>
            </TableHead>
            <tbody>
              {isGroupingEnabled
                ? renderGroupedTableRows({
                    groups: groupedTemplates as GroupedRowTree<TemplateRow>[],
                    colSpan: visibleTemplateColumns.length,
                    renderRow: renderTemplateRow,
                  })
                : sortedTemplates.map((row) => renderTemplateRow(row))}

              {filteredTemplates.length === 0 ? <TableEmptyRow message="No templates found." colSpan={visibleTemplateColumns.length} /> : null}
            </tbody>
        </EmbeddedPageTableShell>
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
      </DashboardTableSurface>

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
    </div>
  )
}
