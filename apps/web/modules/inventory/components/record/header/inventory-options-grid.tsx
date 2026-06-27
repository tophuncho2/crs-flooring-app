"use client"

import { ArrowUpDown } from "lucide-react"
import {
  DataTable,
  DebouncedSearchControl,
  SortMenuBody,
  ToolbarMenuButton,
} from "@/engines/list-view"
import type { InventoryRow } from "@builders/domain"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import { type InventoryOptionsGridController } from "@/modules/inventory/controllers/record/header/use-inventory-options-grid"
import { type InventoryRecordSelectionController } from "@/modules/inventory/controllers/record/use-inventory-record-selection"
import {
  INVENTORY_LIST_COLUMNS,
  INVENTORY_MAX_SORT_LEVELS,
  INVENTORY_SORT_OPTIONS,
} from "../../list/table/inventory-list-columns"
import { renderInventoryRowCell } from "../../list/table/inventory-row-cell"

/** The slice of the selection controller the picker grid reads to render its scope pickers. */
type InventoryOptionsGridSelection = Pick<
  InventoryRecordSelectionController,
  "warehouseId" | "warehouseLabel" | "productId" | "productLabel"
>

/**
 * The inventory reference-header picker grid: a warehouse picker + the four
 * identity search bars (Inv # / Roll # / Dye lot / Note) inline, over a 15-row
 * paginated results table. Clicking a row selects that inventory record. The grid
 * controller is owned by the record surface (so the reference header's Clear can
 * read/reset its search bars) and passed in. Renders rows through the shared
 * `INVENTORY_LIST_COLUMNS` + `renderInventoryRowCell` (same as the list table and
 * the reference row) so column changes propagate to every place a row is shown.
 *
 * `selection` is read structurally (just the four scope fields), so a non-URL
 * caller (the WO-create modal) can feed a local-state object — not only the URL
 * selection controller. `productEditable` locks the product master-filter to a
 * static label when false (the inventory record view locks it to the selected
 * inventory's product; the WO-create modal leaves it editable).
 *
 * `onSelectInventory` receives the full clicked `InventoryRow` so callers can both
 * seed a form and render the row back (the modal shows it as the selected item).
 */
export function InventoryOptionsGrid({
  selection,
  grid,
  onSelectWarehouse,
  onSelectProduct,
  onSelectInventory,
  productEditable = true,
}: {
  selection: InventoryOptionsGridSelection
  grid: InventoryOptionsGridController
  onSelectWarehouse: InventoryRecordSelectionController["selectWarehouse"]
  onSelectProduct: InventoryRecordSelectionController["selectProduct"]
  onSelectInventory: (row: InventoryRow) => void
  productEditable?: boolean
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
        {productEditable ? (
          <ProductPicker
            value={productId}
            selectedLabel={productLabel}
            onChange={() => {}}
            onOptionSelected={onSelectProduct}
            placeholder="All products"
            ariaLabel="Filter inventory by product"
          />
        ) : (
          <div
            className="flex items-center truncate rounded-md border border-[var(--panel-border)] bg-[var(--subpanel-background)] px-3 py-2 text-sm text-[var(--foreground)]/70"
            aria-label="Product (locked)"
            aria-readonly="true"
          >
            {productLabel ?? "Product"}
          </div>
        )}
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

      {/* Multi-column sort — the same builder the inventory list uses, hosted in
          a header tool rather than the table gutter. Header clicks still do a
          single-sort replace via `grid.setSort`. */}
      <div className="flex justify-end">
        <ToolbarMenuButton
          label="Sort"
          title="Sort by"
          icon={ArrowUpDown}
          active={grid.sorts.length > 0}
          bodyClassName="w-auto"
        >
          <SortMenuBody
            options={INVENTORY_SORT_OPTIONS}
            value={grid.sorts}
            maxLevels={INVENTORY_MAX_SORT_LEVELS}
            onChange={grid.onSortsChange}
          />
        </ToolbarMenuButton>
      </div>

      <DataTable
        rows={grid.rows}
        columns={INVENTORY_LIST_COLUMNS}
        renderCell={renderInventoryRowCell}
        onRowClick={(row) => onSelectInventory(row)}
        getRowAriaLabel={(row) => row.inventoryNumber}
        empty={grid.isLoading ? "Searching…" : grid.error ?? "No matches"}
        pagination={grid.pagination}
      />
    </div>
  )
}
