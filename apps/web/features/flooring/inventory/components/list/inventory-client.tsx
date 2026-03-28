"use client"

import { DashboardCardTitle } from "@/features/dashboard/shared/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { DashboardListPageControls } from "@/features/dashboard/shared/list-page/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/features/dashboard/shared/list-page/dashboard-list-page-scaffold"
import { TableColumnSettings } from "@/features/dashboard/shared/table/table-column-settings"
import { TableFilterControls } from "@/features/dashboard/shared/table/table-filter-controls"
import { TablePaginationControls } from "@/features/dashboard/shared/table/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import { useInventoryListController } from "@/features/flooring/inventory/controllers/use-inventory-list-controller"
import type {
  InventoryCategoryOption,
  InventoryServerFilterState,
  InventoryProductOption,
  InventoryRow,
  InventoryWarehouseOption,
  ServerPaginationState,
  ServerTableState,
} from "@/features/flooring/inventory/domain/types"
import { InventoryTable } from "./inventory-table"
import { createInventoryPageFilterDefinitions } from "@/features/flooring/inventory/table-filters"
import {
  formatImportStatus,
  formatTransportType,
} from "@/features/flooring/imports/contracts"

export default function InventoryClient({
  initialInventory,
  tableState,
  filterState,
  warehouseOptions,
  categoryOptions,
  productOptions,
  pagination,
  initialTablePreferences,
}: {
  initialInventory: InventoryRow[]
  tableState: ServerTableState
  filterState: InventoryServerFilterState
  warehouseOptions: InventoryWarehouseOption[]
  categoryOptions: InventoryCategoryOption[]
  productOptions: InventoryProductOption[]
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
    filterGroups,
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
      { key: "allocatedInventory", label: "Allocated Inventory", getValue: (row) => row.totalAllocated, groupable: false },
      { key: "openInventory", label: "Open Inventory", getValue: (row) => row.availableToAllocate, groupable: false },
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
    sortFieldKey: "itemNumber",
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    initialPreferences: initialTablePreferences,
    filterDefinitions: createInventoryPageFilterDefinitions({
      warehouseOptions,
      categoryOptions,
      productOptions,
    }),
    initialFilters: filterState,
    urlSyncMode: "router",
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })

  return (
    <DashboardListPageScaffold
      title={<DashboardCardTitle>Inventory</DashboardCardTitle>}
      controls={
        <DashboardListPageControls
          count={filteredRows.length}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          searchPlaceholder="Search product, item #, import, section, or location"
          isAscendingSort={isAscendingSort}
          onToggleSort={onToggleSort}
          ascendingSortLabel="A-Z"
          descendingSortLabel="Z-A"
          filtersSlot={<TableFilterControls groups={filterGroups} panelKey="inventory-main-filters" />}
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
        />
      }
      notices={<FormStatusNotices message={notices.message} error={notices.error} />}
      table={
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
      }
      pagination={
        <TablePaginationControls
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages ?? totalPages}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? filteredRows.length}
          hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
          hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
          onPreviousPage={pagination ? undefined : goToPreviousPage}
          onNextPage={pagination ? undefined : goToNextPage}
          previousPageHref={pagination?.previousPageHref}
          nextPageHref={pagination?.nextPageHref}
        />
      }
    />
  )
}
