"use client"

import { TextCell, UnitCell } from "@/engines/record-view"
import {
  INVENTORY_DYE_LOT_MAX,
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
  type ProductOption,
  type WarehouseOption,
} from "@builders/domain"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import type { InventoryCreateForm } from "@/modules/inventory/controllers/record/create/use-inventory-create-section"
import { InventoryField } from "../primary/groups/inventory-field"
import { InventoryGroup } from "../primary/groups/inventory-group"

/**
 * Presentational body for the manual create-inventory flow. Top group selects
 * the product + warehouse (both required, immutable after create); second group
 * is the editable item fields. The starting-stock unit suffix reflects the
 * picked product's stock unit. Snapshot/category columns are derived server-side
 * from the product — never entered here.
 */
export function InventoryCreateFields({
  form,
  setField,
  editable,
  productLabel,
  warehouseLabel,
  stockUnitAbbrev,
  onProductSelected,
  onWarehouseSelected,
}: {
  form: InventoryCreateForm
  setField: <K extends keyof InventoryCreateForm>(
    field: K,
    value: InventoryCreateForm[K],
  ) => void
  editable: boolean
  productLabel: string | null
  warehouseLabel: string | null
  stockUnitAbbrev: string
  onProductSelected: (option: ProductOption | null) => void
  onWarehouseSelected: (option: WarehouseOption | null) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <InventoryGroup title="Product & warehouse">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <InventoryField label="Product">
            <ProductPicker
              value={form.productId || null}
              selectedLabel={productLabel}
              onChange={(id) => setField("productId", id ?? "")}
              onOptionSelected={onProductSelected}
              disabled={!editable}
              ariaLabel="Select a product"
            />
          </InventoryField>
          <InventoryField label="Warehouse">
            <WarehousePicker
              value={form.warehouseId || null}
              selectedLabel={warehouseLabel}
              onChange={(id) => setField("warehouseId", id ?? "")}
              onOptionSelected={onWarehouseSelected}
              placeholder="Select a warehouse"
              disabled={!editable}
              ariaLabel="Select a warehouse"
            />
          </InventoryField>
        </div>
      </InventoryGroup>

      <InventoryGroup title="Inventory item">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <InventoryField label="Roll #">
            <TextCell
              editable={editable}
              value={form.rollNumber}
              onChange={(value) => setField("rollNumber", value)}
              maxLength={INVENTORY_ROLL_NUMBER_MAX}
            />
          </InventoryField>
          <InventoryField label="Starting Stock">
            <UnitCell
              editable={editable}
              value={form.startingStock}
              onChange={(value) => setField("startingStock", value)}
              unit={stockUnitAbbrev}
              align="start"
              placeholder="0.00"
              ariaLabel="Starting stock"
            />
          </InventoryField>

          <InventoryField label="Dye Lot">
            <TextCell
              editable={editable}
              value={form.dyeLot}
              onChange={(value) => setField("dyeLot", value)}
              maxLength={INVENTORY_DYE_LOT_MAX}
            />
          </InventoryField>
          <InventoryField label="Note">
            <TextCell
              editable={editable}
              value={form.note}
              onChange={(value) => setField("note", value)}
              maxLength={INVENTORY_NOTE_MAX}
            />
          </InventoryField>

          <InventoryField label="Location">
            <TextCell
              editable={editable}
              value={form.location}
              onChange={(value) => setField("location", value)}
              maxLength={INVENTORY_LOCATION_MAX}
            />
          </InventoryField>

          <InventoryField
            label="Internal Notes"
            className="col-span-2"
            editable={editable}
            currentLength={form.internalNotes.length}
            maxLength={INVENTORY_INTERNAL_NOTES_MAX}
          >
            <TextCell
              editable={editable}
              value={form.internalNotes}
              onChange={(value) => setField("internalNotes", value)}
              maxLength={INVENTORY_INTERNAL_NOTES_MAX}
            />
          </InventoryField>
        </div>
      </InventoryGroup>
    </div>
  )
}
