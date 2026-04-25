"use client"

import { DashboardCardTitle } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { FormStatusNotices } from "@/modules/shared/engines/common/feedback/notices"
import { DashboardListPageControls } from "@/modules/shared/engines/list-view/controls/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold"
import { TablePaginationControls } from "@/modules/shared/engines/list-view/table/table-shell"
import { useConfiguredTableState } from "@/modules/shared/engines/list-view/controllers/use-configured-table-state"
import { type GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import type { InventoryRow } from "@builders/domain"
import { useInventoryListController } from "../../controllers/use-inventory-list-controller"
import { InventoryTable } from "./inventory-table"

export default function InventoryClient({
  initialInventory,
}: {
  initialInventory: InventoryRow[]
}) {
  const { rows, notices, openInventory } = useInventoryListController({
    initialInventory,
  })

  const {
    searchQuery,
    isAscendingSort,
    isGroupingEnabled,
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
    visibleColumns,
    onSearchQueryChange,
    onToggleSort,
  } = useConfiguredTableState({
    rows,
    tableKey: "inventory-main",
    fields: [
      { key: "inventoryNumber", label: "Inv #", getValue: (row) => row.inventoryNumber, groupable: false },
      { key: "importNumber", label: "Import #", getValue: (row) => row.importNumber, groupable: false },
      { key: "product", label: "Product", getValue: (row) => row.productName, groupable: true },
      { key: "itemNumber", label: "Item #", getValue: (row) => row.itemNumber, groupable: false },
      { key: "startingStock", label: "Starting Balance", getValue: (row) => row.startingStock, groupable: false },
      { key: "totalCutSum", label: "Cut Balance", getValue: (row) => row.totalCutSum, groupable: false },
      { key: "stockBalance", label: "Available", getValue: (row) => row.stockBalance, groupable: false },
      { key: "coverageBalance", label: "Coverage", getValue: (row) => row.coverageBalance, defaultHidden: true, groupable: false },
      { key: "section", label: "Section", getValue: (row) => row.sectionNumber, groupable: true },
      { key: "location", label: "Location", getValue: (row) => row.locationShortCode, groupable: true },
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.importWarehouseName || row.warehouseName, groupable: true },
      { key: "fullLocation", label: "Full Location", getValue: (row) => row.locationCode, defaultHidden: true, groupable: true },
      { key: "dyeLot", label: "Dye Lot", getValue: (row) => row.dyeLot, groupable: false },
      { key: "cost", label: "Cost $", getValue: (row) => row.cost, defaultHidden: true, groupable: false },
      { key: "freight", label: "Freight $", getValue: (row) => row.freight, defaultHidden: true, groupable: false },
      { key: "notes", label: "Notes", getValue: (row) => row.notes, defaultHidden: true, groupable: false },
      { key: "updated", label: "Updated", getValue: (row) => row.updatedAt.split("T")[0], defaultHidden: true, groupable: false },
    ],
    sortField: (row) => row.itemNumber,
    sortFieldKey: "itemNumber",
    defaultAscending: true,
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
