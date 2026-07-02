"use client"

import type { ProductOption, UnitOfMeasureOption, WarehouseOption } from "@builders/domain"
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
  UnitPickerField,
  WarehousePickerField,
} from "../fields"

/**
 * Presentational body for the manual create-inventory flow, built on the shared
 * inventory field package (`../fields`) over the record-view engine. Everything
 * stacks in a single left column: Starting Stock | Unit pair lead the top (each
 * half the warehouse width), then Product + Warehouse (both required, immutable
 * after create), Location, and the remaining editable item fields. Snapshot/
 * category columns are derived server-side from the product — never entered here.
 */
export function InventoryCreateFields({
  form,
  setField,
  editable,
  productLabel,
  warehouseLabel,
  unitLabel,
  onProductSelected,
  onUnitSelected,
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
  unitLabel: string | null
  onProductSelected: (option: ProductOption | null) => void
  onUnitSelected: (option: UnitOfMeasureOption | null) => void
  onWarehouseSelected: (option: WarehouseOption | null) => void
}) {
  return (
    <InventoryFieldGrid>
      {/* Starting Stock | Unit paired at the top (each half the warehouse width,
          together spanning the same cols), then Product, Warehouse, Location. */}
      <CellAt col={1} row={1} colSpan={2}>
        <StartingStockField
          required
          editable={editable}
          value={form.startingStock}
          onChange={(value) => setField("startingStock", value)}
        />
      </CellAt>
      <CellAt col={3} row={1} colSpan={2}>
        <UnitPickerField
          required
          value={form.unitId || null}
          selectedLabel={unitLabel}
          onChange={(id) => setField("unitId", id ?? "")}
          onOptionSelected={onUnitSelected}
          disabled={!editable}
          ariaLabel="Select a unit"
        />
      </CellAt>
      <CellAt col={1} row={2} colSpan={4}>
        <ProductPickerField
          required
          value={form.productId || null}
          selectedLabel={productLabel}
          onChange={(id) => setField("productId", id ?? "")}
          onOptionSelected={onProductSelected}
          disabled={!editable}
          ariaLabel="Select a product"
        />
      </CellAt>
      <CellAt col={1} row={3} colSpan={4}>
        <WarehousePickerField
          required
          value={form.warehouseId || null}
          selectedLabel={warehouseLabel}
          onChange={(id) => setField("warehouseId", id ?? "")}
          onOptionSelected={onWarehouseSelected}
          placeholder="Select a warehouse"
          disabled={!editable}
          ariaLabel="Select a warehouse"
        />
      </CellAt>
      <CellAt col={1} row={4} colSpan={4}>
        <LocationField
          editable={editable}
          value={form.location}
          onChange={(value) => setField("location", value)}
        />
      </CellAt>

      <CellAt col={1} row={5} colSpan={4}>
        <RollNumberField
          editable={editable}
          value={form.rollNumber}
          onChange={(value) => setField("rollNumber", value)}
        />
      </CellAt>

      <CellAt col={1} row={6} colSpan={4}>
        <DyeLotField
          editable={editable}
          value={form.dyeLot}
          onChange={(value) => setField("dyeLot", value)}
        />
      </CellAt>
      <CellAt col={1} row={7} colSpan={4}>
        <NoteField editable={editable} value={form.note} onChange={(value) => setField("note", value)} />
      </CellAt>

      <CellAt col={1} row={8} colSpan={4}>
        <InternalNotesField
          editable={editable}
          value={form.internalNotes}
          onChange={(value) => setField("internalNotes", value)}
        />
      </CellAt>
    </InventoryFieldGrid>
  )
}
