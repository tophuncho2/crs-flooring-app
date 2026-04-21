"use client"

import { DashboardCardTitle } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { FormStatusNotices } from "@/modules/shared/engines/common/feedback/notices"
import { DashboardListPageControls } from "@/modules/shared/engines/list-view/controls/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold"
import { TableColumnSettings } from "@/modules/shared/engines/list-view/table/table-column-settings"
import { TableFilterControls } from "@/modules/shared/engines/list-view/table/table-filter-controls"
import { TablePaginationControls } from "@/modules/shared/engines/list-view/table/table-shell"
import { useConfiguredTableState } from "@/modules/shared/engines/list-view/controllers/use-configured-table-state"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import type { TablePreferencePayload } from "@/modules/shared/engines/list-view/controllers/table-preferences"
import {
  formatImportStatus,
  formatImportTransportType as formatTransportType,
  type InventoryCategoryOption,
  type InventoryPageFilterState,
  type InventoryProductOption,
  type InventoryRow,
  type InventoryWarehouseOption,
} from "@builders/domain"
import { useInventoryListController } from "../../controllers/use-inventory-list-controller"
import { createInventoryPageFilterDefinitions } from "./table-filters"
import { InventoryTable } from "./inventory-table"

export default function InventoryClient({
  initialInventory,
  filterState,
  warehouseOptions,
  categoryOptions,
  productOptions,
  initialTablePreferences,
}: {
  initialInventory: InventoryRow[]
  filterState: InventoryPageFilterState
  warehouseOptions: InventoryWarehouseOption[]
  categoryOptions: InventoryCategoryOption[]
  productOptions: InventoryProductOption[]
  initialTablePreferences?: TablePreferencePayload | null
}) {
  const { rows, notices, openInventory } = useInventoryListController({
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
      { key: "stockCount", label: "Starting Balance", getValue: (row) => row.stockCount, groupable: false },
      { key: "totalCutBalance", label: "Cut Balance", getValue: (row) => row.totalCutBalance, groupable: false },
      { key: "awaitingCutBalance", label: "Awaiting Cut", getValue: (row) => row.awaitingCutBalance, groupable: false },
      { key: "availableBalance", label: "Available Balance", getValue: (row) => row.availableBalance, groupable: false },
      { key: "uncutBalance", label: "Uncut Balance", getValue: (row) => row.uncutBalance, groupable: false },
      { key: "section", label: "Section", getValue: (row) => row.sectionNumber, groupable: true },
      { key: "location", label: "Location", getValue: (row) => row.locationCode, groupable: true },
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.importWarehouseName || row.warehouseName, groupable: true },
      { key: "dyeLot", label: "Dye Lot", getValue: (row) => row.dyeLot, groupable: false },
      { key: "cost", label: "Cost $", getValue: (row) => row.cost, defaultHidden: true, groupable: false },
      { key: "freight", label: "Freight $", getValue: (row) => row.freight, defaultHidden: true, groupable: false },
      { key: "notes", label: "Notes", getValue: (row) => row.notes, defaultHidden: true, groupable: false },
      { key: "updated", label: "Updated", getValue: (row) => row.updatedAt.split("T")[0], defaultHidden: true, groupable: false },
    ],
    sortField: (row) => row.itemNumber,
    sortFieldKey: "itemNumber",
    defaultAscending: true,
    initialPreferences: initialTablePreferences,
    filterDefinitions: createInventoryPageFilterDefinitions({
      warehouseOptions,
      categoryOptions,
      productOptions,
    }),
    initialFilters: filterState,
    urlSyncMode: "router",
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
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onOpenInventory={openInventory}
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
  )
}
