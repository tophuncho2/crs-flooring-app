"use client"

import type { ProductOption, WarehouseOption } from "@builders/domain"
import { CellAt } from "@/engines/record-view"
import type { InventoryCreateForm } from "@/modules/inventory/controllers/record/create/use-inventory-create-section"
import {
  DyeLotField,
  InternalNotesField,
  InventoryFieldGrid,
  LocationField,
  NoteField,
  ProductPickerField,
  RollNumberField,
  StartingStockField,
  WarehousePickerField,
} from "../fields"

/**
 * Presentational body for the manual create-inventory flow, built on the shared
 * inventory field package (`../fields`) over the record-view engine. Product +
 * warehouse (both required, immutable after create) sit in the first row; the
 * editable item fields follow. The starting-stock unit suffix reflects the
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
    <InventoryFieldGrid>
      <CellAt col={1} colSpan={8}>
        <ProductPickerField
          value={form.productId || null}
          selectedLabel={productLabel}
          onChange={(id) => setField("productId", id ?? "")}
          onOptionSelected={onProductSelected}
          disabled={!editable}
          ariaLabel="Select a product"
        />
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <WarehousePickerField
          value={form.warehouseId || null}
          selectedLabel={warehouseLabel}
          onChange={(id) => setField("warehouseId", id ?? "")}
          onOptionSelected={onWarehouseSelected}
          placeholder="Select a warehouse"
          disabled={!editable}
          ariaLabel="Select a warehouse"
        />
      </CellAt>

      <CellAt col={1} colSpan={8}>
        <RollNumberField
          editable={editable}
          value={form.rollNumber}
          onChange={(value) => setField("rollNumber", value)}
        />
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <StartingStockField
          editable={editable}
          value={form.startingStock}
          onChange={(value) => setField("startingStock", value)}
          unit={stockUnitAbbrev}
        />
      </CellAt>

      <CellAt col={1} colSpan={8}>
        <DyeLotField
          editable={editable}
          value={form.dyeLot}
          onChange={(value) => setField("dyeLot", value)}
        />
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <NoteField editable={editable} value={form.note} onChange={(value) => setField("note", value)} />
      </CellAt>

      <CellAt col={1} colSpan={8}>
        <LocationField
          editable={editable}
          value={form.location}
          onChange={(value) => setField("location", value)}
        />
      </CellAt>

      <CellAt col={1} colSpan={8}>
        <InternalNotesField
          editable={editable}
          value={form.internalNotes}
          onChange={(value) => setField("internalNotes", value)}
        />
      </CellAt>
    </InventoryFieldGrid>
  )
}
