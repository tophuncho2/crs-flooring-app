"use client"

import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { InlineAddRowButton } from "@/features/flooring/shared/ui/table/collapsible-table-section"
import { RecordChildTableSection, ModalTableHead } from "@/features/flooring/shared/line-items/record-child-table-section"
import { TableHeaderCell } from "@/features/dashboard/shared/table/table-shell"

type ProductOption = {
  id: string
  label: string
  stockUnit: string
}

type WarehouseOption = {
  id: string
  name: string
}

type LocationOption = {
  id: string
  warehouseId: string
  locationCode: string
  label: string
}

export type ImportItemDraft = {
  clientId: string
  productId: string
  itemNumber: string
  stockCount: string
  locationId: string
  dyeLot: string
  cost: string
  freight: string
  notes: string
}

export function ImportInventoryRowsSection({
  items,
  productOptions,
  warehouseOptions,
  locationOptions,
  warehouseId,
  totalCostLabel,
  onItemFieldChange,
  onAddItemRow,
  onRemoveItemRow,
}: {
  items: ImportItemDraft[]
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  locationOptions: LocationOption[]
  warehouseId: string
  totalCostLabel: string
  onItemFieldChange: (index: number, field: keyof ImportItemDraft, value: string) => void
  onAddItemRow: () => void
  onRemoveItemRow: (index: number) => void
}) {
  return (
    <RecordChildTableSection title="Import Inventory Rows" titleMeta={totalCostLabel} minWidthClass="min-w-[1320px]">
      <ModalTableHead>
        <tr>
          <TableHeaderCell>Product</TableHeaderCell>
          <TableHeaderCell>Item #</TableHeaderCell>
          <TableHeaderCell>Stock</TableHeaderCell>
          <TableHeaderCell>Location</TableHeaderCell>
          <TableHeaderCell>Dye Lot</TableHeaderCell>
          <TableHeaderCell>Cost $</TableHeaderCell>
          <TableHeaderCell>Freight $</TableHeaderCell>
          <TableHeaderCell>Warehouse</TableHeaderCell>
          <TableHeaderCell>Notes</TableHeaderCell>
          <TableHeaderCell>Remove</TableHeaderCell>
        </tr>
      </ModalTableHead>
      <tbody>
        {items.map((item, index) => {
          const filteredLocations = warehouseId
            ? locationOptions.filter((location) => location.warehouseId === warehouseId)
            : locationOptions
          const selectedProduct = productOptions.find((product) => product.id === item.productId)

          return (
            <tr key={item.clientId} className="border-t border-[var(--panel-border)]">
              <td className="px-3 py-2">
                <select
                  value={item.productId}
                  onChange={(event) => onItemFieldChange(index, "productId", event.target.value)}
                  className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                >
                  <option value="">Select product</option>
                  {productOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                <input
                  value={item.itemNumber}
                  onChange={(event) => onItemFieldChange(index, "itemNumber", event.target.value)}
                  className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                />
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <input
                    value={item.stockCount}
                    onChange={(event) => onItemFieldChange(index, "stockCount", event.target.value)}
                    className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                  />
                  <span className="text-xs text-[var(--foreground)]/60">{selectedProduct?.stockUnit || "unit"}</span>
                </div>
              </td>
              <td className="px-3 py-2">
                <select
                  value={item.locationId}
                  onChange={(event) => onItemFieldChange(index, "locationId", event.target.value)}
                  className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                >
                  <option value="">Select location</option>
                  {filteredLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                <input
                  value={item.dyeLot}
                  onChange={(event) => onItemFieldChange(index, "dyeLot", event.target.value)}
                  className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  value={item.cost}
                  onChange={(event) => onItemFieldChange(index, "cost", event.target.value)}
                  className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                />
              </td>
              <td className="px-3 py-2">
                <input
                  value={item.freight}
                  onChange={(event) => onItemFieldChange(index, "freight", event.target.value)}
                  className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                />
              </td>
              <td className="px-3 py-2">{warehouseOptions.find((warehouse) => warehouse.id === warehouseId)?.name || "-"}</td>
              <td className="px-3 py-2">
                <input
                  value={item.notes}
                  onChange={(event) => onItemFieldChange(index, "notes", event.target.value)}
                  className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                />
              </td>
              <td className="px-3 py-2">
                <DeleteRowButton onClick={() => onRemoveItemRow(index)}>Remove</DeleteRowButton>
              </td>
            </tr>
          )
        })}
        <tr className="border-t border-[var(--panel-border)]">
          <td colSpan={10} className="px-3 py-3">
            <InlineAddRowButton label="Add Import Inventory Item" onClick={onAddItemRow} />
          </td>
        </tr>
      </tbody>
    </RecordChildTableSection>
  )
}
