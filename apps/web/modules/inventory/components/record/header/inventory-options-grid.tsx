"use client"

import {
  DataTable,
  DebouncedSearchControl,
  PaginateControls,
} from "@/engines/list-view"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import {
  INVENTORY_PICKER_PAGE_SIZE,
  type InventoryOptionsGridController,
} from "@/modules/inventory/controllers/record/header/use-inventory-options-grid"
import {
  toInventoryOption,
  type InventoryRecordSelectionController,
} from "@/modules/inventory/controllers/record/use-inventory-record-selection"
import { INVENTORY_LIST_COLUMNS } from "../../list/table/inventory-list-columns"
import { renderInventoryRowCell } from "../../list/table/inventory-row-cell"

/**
 * The inventory reference-header picker grid: a warehouse picker + the four
 * identity search bars (Inv # / Roll # / Dye lot / Note) inline, over a 15-row
 * paginated results table. Clicking a row selects that inventory record. The grid
 * controller is owned by the record surface (so the reference header's Clear can
 * read/reset its search bars) and passed in. Renders rows through the shared
 * `INVENTORY_LIST_COLUMNS` + `renderInventoryRowCell` (same as the list table and
 * the reference row) so column changes propagate to every place a row is shown.
 */
export function InventoryOptionsGrid({
  selection,
  grid,
  onSelectWarehouse,
  onSelectProduct,
  onSelectInventory,
}: {
  selection: InventoryRecordSelectionController
  grid: InventoryOptionsGridController
  onSelectWarehouse: InventoryRecordSelectionController["selectWarehouse"]
  onSelectProduct: InventoryRecordSelectionController["selectProduct"]
  onSelectInventory: InventoryRecordSelectionController["selectInventory"]
}) {
  const { warehouseId, warehouseLabel, productId, productLabel } = selection

  return (
    <div className="flex flex-col gap-3">
      {/* Scope pickers: warehouse (optional — inventory cross-sources across
          warehouses) + product (the master filter). Both just narrow the list. */}
      <div className="grid gap-2 sm:grid-cols-2">
        <WarehousePicker
          value={warehouseId}
          selectedLabel={warehouseLabel}
          onChange={() => {}}
          onOptionSelected={onSelectWarehouse}
          placeholder="Select warehouse"
          ariaLabel="Select warehouse"
        />
        <ProductPicker
          value={productId}
          selectedLabel={productLabel}
          onChange={() => {}}
          onOptionSelected={onSelectProduct}
          placeholder="All products"
          ariaLabel="Filter inventory by product"
        />
      </div>
      {/* Identity search bars. */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <DebouncedSearchControl
          value={grid.invNumber}
          onCommit={grid.setInvNumber}
          placeholder="Inv #"
          ariaLabel="Search inventory by inventory number"
        />
        <DebouncedSearchControl
          value={grid.rollNumber}
          onCommit={grid.setRollNumber}
          placeholder="Roll #"
          ariaLabel="Search inventory by roll number"
        />
        <DebouncedSearchControl
          value={grid.dyeLot}
          onCommit={grid.setDyeLot}
          placeholder="Dye lot"
          ariaLabel="Search inventory by dye lot"
        />
        <DebouncedSearchControl
          value={grid.note}
          onCommit={grid.setNote}
          placeholder="Note"
          ariaLabel="Search inventory by note"
        />
      </div>

      <DataTable
        rows={grid.rows}
        columns={INVENTORY_LIST_COLUMNS}
        renderCell={renderInventoryRowCell}
        onRowClick={(row) => onSelectInventory(toInventoryOption(row))}
        getRowAriaLabel={(row) => row.inventoryItem}
        empty={grid.isLoading ? "Searching…" : grid.error ?? "No matches"}
        footerSlot={
          <PaginateControls
            page={grid.page}
            pageSize={INVENTORY_PICKER_PAGE_SIZE}
            totalItems={grid.total}
            totalPages={grid.totalPages}
            hasPreviousPage={grid.hasPrevious}
            hasNextPage={grid.hasNext}
            onPreviousPage={grid.goToPrevious}
            onNextPage={grid.goToNext}
          />
        }
      />
    </div>
  )
}
