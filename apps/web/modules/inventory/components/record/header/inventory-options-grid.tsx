"use client"

import { ArrowUpDown, Search, SlidersHorizontal } from "lucide-react"
import {
  DataTable,
  DebouncedSearchControl,
  FilterGroupLabel,
  SortMenuBody,
  ToolbarMenuButton,
} from "@/engines/list-view"
import { FilterPickerChip } from "@/engines/picker"
import type { InventoryRow, ProductOption, WarehouseOption } from "@builders/domain"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
// Interim: reuse the inventory list's archive control in place. The future
// archiving-consolidation epic relocates it to a shared home.
import { ArchiveSegmentedControl } from "../../list/toolbar-controls/archive-segmented-control"
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
 * The inventory reference-header picker grid: a Filter · Search · Sort toolbar
 * (warehouse + product + archive scope; the four identity search bars Inv # /
 * Roll # / Dye lot / Note; multi-column sort) over a 15-row paginated results
 * table. Clicking a row selects that inventory record. The grid
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
      {/* One toolbar row mirroring the inventory list: Filter (scope pickers +
          archive) · Search (the four identity bars) · Sort. Same engine
          primitives, composed module-locally (the grid's filter set differs from
          the list's, so no shared menu-body). */}
      <div className="flex items-center justify-end gap-2">
        {/* Filter — Warehouse + Product scope + Archive. Both pickers just narrow
            the list; warehouse is optional (inventory cross-sources across
            warehouses), product is the master filter (locked when not editable). */}
        <ToolbarMenuButton
          label="Filter"
          icon={SlidersHorizontal}
          active={Boolean(warehouseId || productId || grid.isArchived)}
        >
          <FilterPickerChip<WarehouseOption>
            value={warehouseId}
            selectedLabel={warehouseLabel}
            onOptionSelected={onSelectWarehouse}
            onChange={(id) => {
              if (id === null) onSelectWarehouse(null)
            }}
            nounSingular="Warehouse"
            nounPlural="warehouses"
            subject="inventory"
          >
            {(chrome) => <WarehousePicker {...chrome} />}
          </FilterPickerChip>
          {productEditable ? (
            <FilterPickerChip<ProductOption>
              value={productId}
              selectedLabel={productLabel}
              onOptionSelected={onSelectProduct}
              onChange={(id) => {
                if (id === null) onSelectProduct(null)
              }}
              nounSingular="Product"
              nounPlural="products"
              subject="inventory"
            >
              {(chrome) => <ProductPicker {...chrome} />}
            </FilterPickerChip>
          ) : (
            <div
              className="flex items-center truncate rounded-md border border-[var(--panel-border)] bg-[var(--subpanel-background)] px-3 py-2 text-sm text-[var(--foreground)]/70"
              aria-label="Product (locked)"
              aria-readonly="true"
            >
              {productLabel ?? "Product"}
            </div>
          )}
          <ArchiveSegmentedControl value={grid.isArchived} onChange={grid.setIsArchived} />
        </ToolbarMenuButton>

        {/* Search — the four identity bars (Inv # / Roll # / Dye lot / Note). The
            grid has no Product-search column (that's list-only). */}
        <ToolbarMenuButton
          label="Search"
          icon={Search}
          active={grid.hasSearch}
          bodyClassName="w-[28rem]"
        >
          <div className="flex flex-col gap-2">
            <FilterGroupLabel>Identity</FilterGroupLabel>
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
        </ToolbarMenuButton>

        {/* Multi-column sort — the same builder the inventory list uses. */}
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

      {/* Bleed the picker list to the modal panel wall (-mx-5 cancels the
          RecordModal body's px-5) + squared corners — flush like every other
          table. The filter/search/sort toolbar above stays inset. */}
      <div className="-mx-5">
        <DataTable
          rows={grid.rows}
          columns={INVENTORY_LIST_COLUMNS}
          renderCell={renderInventoryRowCell}
          onRowClick={(row) => onSelectInventory(row)}
          getRowAriaLabel={(row) => row.inventoryNumber}
          empty={grid.isLoading ? "Searching…" : grid.error ?? "No matches"}
          pagination={grid.pagination}
          flush
        />
      </div>
    </div>
  )
}
