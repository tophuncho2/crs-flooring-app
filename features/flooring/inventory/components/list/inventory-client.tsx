"use client"

import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardHeader } from "@/features/flooring/shared/ui/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { TableColumnSettings } from "@/features/flooring/shared/ui/table/table-column-settings"
import TableControlsBar from "@/features/flooring/shared/ui/table/table-controls-bar"
import { TableActionsSummary } from "@/features/flooring/shared/ui/table/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { useServerTableQueryControls } from "@/features/flooring/shared/controllers/table/use-server-table-query-controls"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import { useInventoryListController } from "@/features/flooring/inventory/controllers/use-inventory-list-controller"
import type { InventoryRow, ServerPaginationState, ServerTableState } from "@/features/flooring/inventory/domain/types"
import { InventoryTable } from "./inventory-table"
import {
  formatImportStatus,
  formatTransportType,
} from "@/features/flooring/imports/contracts"

export default function InventoryClient({
  initialInventory,
  tableState,
  pagination,
  initialTablePreferences,
}: {
  initialInventory: InventoryRow[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
  initialTablePreferences?: TablePreferencePayload | null
}) {
  const {
    rows,
    notices,
    deletingInventoryId,
    openInventory,
    deleteInventory,
  } = useInventoryListController({
    initialInventory,
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
    rows,
    tableKey: "inventory-main",
    fields: [
      { key: "importNumber", label: "Import #", getValue: (row) => row.importNumber, groupable: false },
      { key: "importTag", label: "Import Tag", getValue: (row) => row.importTag, groupable: false },
      { key: "status", label: "Import Status", getValue: (row) => formatImportStatus(row.importStatus), groupable: true },
      { key: "transport", label: "Transport", getValue: (row) => formatTransportType(row.importTransportType), groupable: true },
      { key: "product", label: "Product", getValue: (row) => row.productName, groupable: true },
      { key: "itemNumber", label: "Item #", getValue: (row) => row.itemNumber, groupable: false },
      { key: "stockCount", label: "Starting Stock", getValue: (row) => row.stockCount, groupable: false },
      { key: "cutTotal", label: "Cuts Total", getValue: (row) => row.cutTotal, groupable: false },
      { key: "runningBalance", label: "Running Balance", getValue: (row) => row.runningBalance, groupable: false },
      { key: "section", label: "Section", getValue: (row) => row.sectionName, groupable: true },
      { key: "location", label: "Location", getValue: (row) => row.locationCode, groupable: true },
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.importWarehouseName || row.warehouseName, groupable: true },
      { key: "dyeLot", label: "Dye Lot", getValue: (row) => row.dyeLot, groupable: false },
      { key: "cost", label: "Cost $", getValue: (row) => row.cost, defaultHidden: true, groupable: false },
      { key: "freight", label: "Freight $", getValue: (row) => row.freight, defaultHidden: true, groupable: false },
      { key: "notes", label: "Notes", getValue: (row) => row.notes, defaultHidden: true, groupable: false },
      { key: "updated", label: "Updated", getValue: (row) => row.updatedAt.split("T")[0], defaultHidden: true, groupable: false },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => row.itemNumber,
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    initialPreferences: initialTablePreferences,
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })

  const serverTableControls = useServerTableQueryControls({
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupOptions: groupFields.map((field) => ({ key: field.key, label: field.label })),
  })

  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <DashboardCardHeader
          title="Inventory"
          actions={(
            <TableActionsSummary count={filteredRows.length}>
              <TableControlsBar
                searchQuery={searchQuery}
                onSearchQueryChange={serverTableControls.onSearchQueryChange}
                searchPlaceholder="Search product, item #, import, section, or location"
                isAscendingSort={isAscendingSort}
                onToggleSort={serverTableControls.onToggleSort}
                ascendingSortLabel="A-Z"
                descendingSortLabel="Z-A"
              >
                <TableColumnSettings
                  columns={allColumns}
                  hiddenColumnKeys={hiddenColumnKeys}
                  onToggleColumn={toggleColumnVisibility}
                  onMoveColumn={moveColumn}
                  onSetColumnOrder={setColumnOrder}
                  groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                  maxGroupFields={MAX_GROUP_FIELDS}
                  onToggleGroupedColumn={serverTableControls.onToggleGroupByKey}
                />
              </TableControlsBar>
            </TableActionsSummary>
          )}
        />

        <FormStatusNotices message={notices.message} error={notices.error} className="mt-4" />

        <section className="mt-6">
          <InventoryTable
            rows={sortedRows}
            groupedRows={groupedRowTree as GroupedRowTree<InventoryRow>[]}
            isGroupingEnabled={isGroupingEnabled}
            visibleColumnKeys={visibleColumns.map((column) => column.key)}
            visibleColumns={visibleColumns.map((column) => ({ key: column.key, label: column.label }))}
            pagination={pagination}
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredRows.length}
            hasPreviousPage={hasPreviousPage}
            hasNextPage={hasNextPage}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
            deletingInventoryId={deletingInventoryId}
            onDeleteInventory={deleteInventory}
            onOpenInventory={openInventory}
          />
        </section>
      </section>
    </div>
  )
}
