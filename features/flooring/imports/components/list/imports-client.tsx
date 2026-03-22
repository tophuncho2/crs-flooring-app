"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/flooring/shared/ui/display/accent-styles"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardHeader } from "@/features/flooring/shared/ui/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { TableColumnSettings } from "@/features/flooring/shared/ui/table/table-column-settings"
import TableControlsBar from "@/features/flooring/shared/ui/table/table-controls-bar"
import { TableActionsSummary } from "@/features/flooring/shared/ui/table/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { useServerTableQueryControls } from "@/features/flooring/shared/controllers/table/use-server-table-query-controls"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import {
  formatImportStatus,
  formatTransportType,
} from "@/features/flooring/imports/contracts"
import {
  type ImportRow,
  type ProductOption,
  type WarehouseOption,
  type LocationOption,
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
  productOptions,
  warehouseOptions,
  locationOptions,
  tableState,
  pagination,
}: {
  initialImports: ImportRow[]
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  locationOptions: LocationOption[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
}) {
  const {
    imports,
    draft,
    isCreateModalOpen,
    isSaving,
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
  } = useImportsListController({
    initialImports,
    productOptions,
    locationOptions,
  })

  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupFields,
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
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })
  const importGroupOptions = groupFields.map((field) => ({ key: field.key, label: field.label }))
  const serverTableControls = useServerTableQueryControls({
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupOptions: importGroupOptions,
  })
  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <DashboardCardHeader
          title="Imports"
          actions={(
            <TableActionsSummary count={filteredImports.length}>
              <TableControlsBar
                searchQuery={searchQuery}
                onSearchQueryChange={serverTableControls.onSearchQueryChange}
                searchPlaceholder="Search import # or tag"
                isAscendingSort={isAscendingSort}
                onToggleSort={serverTableControls.onToggleSort}
                ascendingSortLabel="1-9"
                descendingSortLabel="9-1"
              >
                <TableColumnSettings
                  columns={orderedImportColumns}
                  hiddenColumnKeys={hiddenImportColumnKeys}
                  onToggleColumn={toggleImportColumnVisibility}
                  onMoveColumn={moveImportColumn}
                  onSetColumnOrder={setImportColumnOrder}
                  groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                  maxGroupFields={MAX_GROUP_FIELDS}
                  onToggleGroupedColumn={serverTableControls.onToggleGroupByKey}
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
          )}
        />

        <FormStatusNotices message={message} error={pageError} className="mt-4" />

        <section className="mt-6">
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
        </section>
      </section>

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
        error={createModalError}
      />
    </div>
  )
}
