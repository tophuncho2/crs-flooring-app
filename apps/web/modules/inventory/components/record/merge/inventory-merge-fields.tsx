"use client"

import type { WarehouseOption } from "@builders/domain"
import { CellAt, FormField, StaticFieldValue } from "@/engines/record-view"
import type { InventoryMergeForm } from "@/modules/inventory/controllers/record/merge/use-inventory-merge-section"
import {
  DyeLotField,
  InternalNotesField,
  InventoryFieldGrid,
  LocationField,
  NoteField,
  RollNumberField,
  StartingStockField,
  WarehousePickerField,
} from "../fields"

/**
 * Presentational body for the merge-inventory flow. Mirrors the create form's
 * cells, with two differences the merge dictates: **Product** is read-only
 * (seeded from the locked picker scope above) and **Starting Stock** is read-only
 * (the derived Σ remaining balance of the selected rows). Warehouse — operator
 * choice for the new row — plus the identity fields stay editable.
 */
export function InventoryMergeFields({
  form,
  setField,
  setWarehouse,
  editable,
  productLabel,
  warehouseLabel,
  stockUnitAbbrev,
  summedStartingStock,
}: {
  form: InventoryMergeForm
  setField: <K extends keyof InventoryMergeForm>(field: K, value: InventoryMergeForm[K]) => void
  setWarehouse: (option: WarehouseOption | null) => void
  editable: boolean
  productLabel: string | null
  warehouseLabel: string | null
  stockUnitAbbrev: string
  summedStartingStock: string
}) {
  return (
    <InventoryFieldGrid>
      <CellAt col={1} colSpan={4}>
        <FormField label="Product">
          <StaticFieldValue>{productLabel || "Pick a product above"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={2}>
        {/* Read-only — the merged row's starting stock is the Σ balance of the
            selected rows; the server recomputes it authoritatively under lock. */}
        <StartingStockField
          editable={false}
          value={summedStartingStock}
          onChange={() => {}}
          unit={stockUnitAbbrev}
        />
      </CellAt>

      <CellAt col={1} colSpan={4}>
        <WarehousePickerField
          value={form.warehouseId || null}
          selectedLabel={warehouseLabel}
          onChange={() => {}}
          onOptionSelected={(option) => setWarehouse(option)}
          placeholder="Select a warehouse"
          disabled={!editable}
          ariaLabel="Select a warehouse"
        />
      </CellAt>
      <CellAt col={5} colSpan={2}>
        <LocationField
          editable={editable}
          value={form.location}
          onChange={(value) => setField("location", value)}
        />
      </CellAt>

      <CellAt col={1} colSpan={4}>
        <RollNumberField
          editable={editable}
          value={form.rollNumber}
          onChange={(value) => setField("rollNumber", value)}
        />
      </CellAt>

      <CellAt col={1} colSpan={4}>
        <DyeLotField
          editable={editable}
          value={form.dyeLot}
          onChange={(value) => setField("dyeLot", value)}
        />
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <NoteField editable={editable} value={form.note} onChange={(value) => setField("note", value)} />
      </CellAt>

      <CellAt col={1} colSpan={4}>
        <InternalNotesField
          editable={editable}
          value={form.internalNotes}
          onChange={(value) => setField("internalNotes", value)}
        />
      </CellAt>
    </InventoryFieldGrid>
  )
}
