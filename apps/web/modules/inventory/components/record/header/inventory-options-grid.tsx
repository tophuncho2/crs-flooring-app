"use client"

import { formatInventoryQuantity, type InventoryRow } from "@builders/domain"
import {
  DataTable,
  DebouncedSearchControl,
  PaginateControls,
  type DataTableColumn,
} from "@/engines/list-view"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  useInventoryOptionsGrid,
  INVENTORY_PICKER_PAGE_SIZE,
} from "@/modules/inventory/controllers/record/header/use-inventory-options-grid"
import {
  toInventoryOption,
  type InventoryRecordSelectionController,
} from "@/modules/inventory/controllers/record/use-inventory-record-selection"

const COLUMNS: ReadonlyArray<DataTableColumn<InventoryRow>> = [
  { key: "inventoryItem", label: "Item" },
  { key: "inventoryNumber", label: "Inv #" },
  { key: "rollNumber", label: "Roll #" },
  { key: "dyeLot", label: "Dye lot" },
  { key: "location", label: "Location" },
  { key: "warehouseName", label: "Warehouse" },
  {
    key: "stockBalance",
    label: "Stock",
    align: "end",
    render: (row) => formatInventoryQuantity(row.stockBalance, row.stockUnitAbbrev),
  },
]

/**
 * The inventory reference-header picker grid: a warehouse picker + the four
 * identity search bars (Inv # / Roll # / Dye lot / Note) inline, over a 15-row
 * paginated results table. Clicking a row selects that inventory record.
 * Reuses the list-view engine's presentational primitives (DataTable /
 * DebouncedSearchControl / PaginateControls) so the list's richer filter tools
 * can be folded in later.
 */
export function InventoryOptionsGrid({
  selection,
  onSelectWarehouse,
  onSelectInventory,
}: {
  selection: InventoryRecordSelectionController
  onSelectWarehouse: InventoryRecordSelectionController["selectWarehouse"]
  onSelectInventory: InventoryRecordSelectionController["selectInventory"]
}) {
  const { warehouseId, warehouseLabel, productFilterId } = selection
  const grid = useInventoryOptionsGrid({ warehouseId, productFilterId })

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <WarehousePicker
          value={warehouseId}
          selectedLabel={warehouseLabel}
          onChange={() => {}}
          onOptionSelected={onSelectWarehouse}
          placeholder="Select warehouse"
          ariaLabel="Select warehouse"
        />
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

      {warehouseId === null ? (
        <div className="rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--subpanel-background)] px-5 py-8 text-center text-sm text-[var(--foreground)]/60">
          Select a warehouse to search inventory.
        </div>
      ) : (
        <DataTable
          rows={grid.rows}
          columns={COLUMNS}
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
      )}
    </div>
  )
}
