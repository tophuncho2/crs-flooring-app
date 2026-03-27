"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/flooring/shared/ui/display/accent-styles"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardHeader } from "@/features/flooring/shared/ui/display/dashboard-card-title"
import { DashboardTableSurface } from "@/features/flooring/shared/ui/display/dashboard-table-surface"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { TableColumnSettings } from "@/features/flooring/shared/ui/table/table-column-settings"
import TableControlsBar from "@/features/flooring/shared/ui/table/table-controls-bar"
import { TableFilterControls } from "@/features/flooring/shared/ui/table/table-filter-controls"
import { TableActionsSummary } from "@/features/flooring/shared/ui/table/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import {
  formatImportStatus,
  formatTransportType,
} from "@/features/flooring/imports/contracts"
import type { ImportPageFilterState } from "@/features/flooring/imports/domain/filters"
import { createImportsPageFilterDefinitions } from "@/features/flooring/imports/table-filters"
import {
  type ImportRow,
  type WarehouseOption,
  useImportsListController,
} from "@/features/flooring/imports/controllers/use-imports-list-controller"
import { ImportsCreateModal } from "./imports-create-modal"
import { ImportsTable } from "./imports-table"

type ServerPaginationState = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  previousPageHref: string
  nextPageHref: string
}

type ServerTableState = {
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
}

export default function ImportsClient({
  initialImports,
  initialTablePreferences,
  tableState,
  filterState,
  filterWarehouseOptions,
  pagination,
}: {
  initialImports: ImportRow[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: ServerTableState
  filterState: ImportPageFilterState
  filterWarehouseOptions: WarehouseOption[]
  pagination?: ServerPaginationState
}) {
  const {
    imports,
    draft,
    isCreateModalOpen,
    isSaving,
    isLoadingOptions,
    deletingId,
    message,
    pageError,
    createModalError,
    createValidation,
    openCreateModal,
    closeCreateModal,
    setDraftField,
    setItemField,
    addItemRow,
    removeItemRow,
    createImport,
    deleteImport,
    openImport,
    productLookup,
    productOptions,
    warehouseOptions,
    locationOptions,
  } = useImportsListController({
    initialImports,
  })

  const {
    searchQuery,
    isAscendingSort,
    isGroupingEnabled,
    groupByKeys,
    filteredRows: filteredImports,
    sortedRows: sortedImports,
    groupedRowTree,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    allColumns: orderedImportColumns,
    visibleColumns: visibleImportColumns,
    hiddenColumnKeys: hiddenImportColumnKeys,
    toggleColumnVisibility: toggleImportColumnVisibility,
    moveColumn: moveImportColumn,
    setColumnOrder: setImportColumnOrder,
    onSearchQueryChange,
    onToggleSort,
    onToggleGroupedColumn,
    filterGroups,
  } = useConfiguredTableState({
    rows: imports,
    tableKey: "imports-main",
    fields: [
      { key: "importNumber", label: "Import #", getValue: (row) => `IMP-${String(row.importNumber).padStart(4, "0")}`, groupable: false },
      { key: "tag", label: "Tag", getValue: (row) => row.tag, groupable: false },
      { key: "transport", label: "Transport", getValue: (row) => formatTransportType(row.transportType), groupable: true },
      { key: "status", label: "Status", getValue: (row) => formatImportStatus(row.status), groupable: true },
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.warehouseName, groupable: true },
      { key: "created", label: "Created", getValue: (row) => row.createdAt, groupable: false },
      { key: "items", label: "Items", getValue: (row) => String(row.itemsCount), groupable: false },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => String(row.importNumber),
    sortFieldKey: "importNumber",
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    filterDefinitions: createImportsPageFilterDefinitions(filterWarehouseOptions),
    initialFilters: filterState,
    urlSyncMode: "router",
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
    initialPreferences: initialTablePreferences,
  })
  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <DashboardTableSurface
        title="Imports"
        actions={
          <TableActionsSummary count={filteredImports.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              searchPlaceholder="Search import # or tag"
              isAscendingSort={isAscendingSort}
              onToggleSort={onToggleSort}
              ascendingSortLabel="1-9"
              descendingSortLabel="9-1"
            >
              <TableFilterControls groups={filterGroups} panelKey="imports-main-filters" />
              <TableColumnSettings
                columns={orderedImportColumns}
                hiddenColumnKeys={hiddenImportColumnKeys}
                onToggleColumn={toggleImportColumnVisibility}
                onMoveColumn={moveImportColumn}
                onSetColumnOrder={setImportColumnOrder}
                groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                maxGroupFields={MAX_GROUP_FIELDS}
                onToggleGroupedColumn={onToggleGroupedColumn}
              />
              <button
                type="button"
                onClick={openCreateModal}
                className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
              >
                <Plus size={16} />
                Import
              </button>
            </TableControlsBar>
          </TableActionsSummary>
        }
        notices={<FormStatusNotices message={message} error={pageError} />}
      >
        <ImportsTable
          rows={sortedImports}
          groupedRows={groupedRowTree as GroupedRowTree<ImportRow>[]}
          isGroupingEnabled={isGroupingEnabled}
          visibleColumnKeys={visibleImportColumns.map((column) => column.key)}
          visibleColumns={visibleImportColumns.map((column) => ({ key: column.key, label: column.label }))}
          pagination={pagination}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredImports.length}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          deletingImportId={deletingId}
          onDeleteImport={deleteImport}
          onOpenImport={openImport}
        />
      </DashboardTableSurface>

      <ImportsCreateModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        draft={draft}
        warehouseOptions={warehouseOptions}
        productOptions={productOptions}
        locationOptions={locationOptions}
        productLookup={productLookup}
        validation={createValidation}
        onDraftFieldChange={setDraftField}
        onItemFieldChange={setItemField}
        onAddItemRow={addItemRow}
        onRemoveItemRow={removeItemRow}
        onSave={createImport}
        isSaving={isSaving}
        isLoadingOptions={isLoadingOptions}
        error={createModalError}
      />
    </div>
  )
}
