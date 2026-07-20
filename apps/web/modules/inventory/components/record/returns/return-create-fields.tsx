"use client"

import type {
  ConversionFormulaOption,
  ProductOption,
  UnitOfMeasureOption,
  WarehouseOption,
} from "@builders/domain"
import { INVENTORY_ADJUSTMENT_AREA_MAX } from "@builders/domain"
import {
  CellAt,
  FormField,
  NumberCell,
  SegmentedChoiceCell,
  TextCell,
  type SegmentedChoiceOption,
} from "@/engines/record-view"
import { SegmentedDropdown } from "@/engines/picker"
import { PaletteColorDropdown } from "@/engines/common"
import type { ReturnCreateForm } from "@/modules/inventory/controllers/record/returns/use-return-create-form"
import {
  ConversionFormulaPickerField,
  CoveragePerUnitField,
  CoverageUnitPickerField,
  DyeLotField,
  InventoryFieldGrid,
  LocationField,
  NoteField,
  ProductPickerField,
  RollNumberField,
  UnitPickerField,
  WarehousePickerField,
} from "../fields"

// Locked to INCREASE — a return only ever adds stock. Rendered disabled so the
// direction is visible but not changeable (per the "just not the direction" rule).
const ADJUSTMENT_TYPE_OPTIONS = [
  { value: "DEDUCTION", label: "Deduction", tone: "error" },
  { value: "INCREASE", label: "Increase", tone: "success" },
] as const

const WASTE_OPTIONS: ReadonlyArray<SegmentedChoiceOption> = [
  { value: "WASTE", label: "Waste", tone: "warning" },
  { value: "NON_WASTE", label: "Non-waste", tone: "default" },
]

/**
 * The Create Return composite body — the full inventory-create field set AND the
 * INCREASE adjustment's own facts, all seeded and editable, in one narrow
 * `InventoryFieldGrid` column. `startingStock` is hidden (hardcoded "0"),
 * `cost`/`freight`/`internalNotes` are omitted, and the adjustment **direction**
 * (Type) is shown but locked to Increase. One Location field feeds both the new
 * inventory row and the adjustment. A single Returned Quantity field (no unit
 * suffix — the Unit picker sits beside it) is the adjustment quantity.
 */
export function ReturnCreateFields({
  form,
  setField,
  editable,
  productLabel,
  warehouseLabel,
  unitLabel,
  coverageUnitLabel,
  conversionFormulaLabel,
  onProductSelected,
  onUnitSelected,
  onWarehouseSelected,
  onCoverageUnitSelected,
  onFormulaSelected,
}: {
  form: ReturnCreateForm
  setField: <K extends keyof ReturnCreateForm>(field: K, value: ReturnCreateForm[K]) => void
  editable: boolean
  productLabel: string | null
  warehouseLabel: string | null
  unitLabel: string | null
  coverageUnitLabel: string | null
  conversionFormulaLabel: string | null
  onProductSelected: (option: ProductOption | null) => void
  onUnitSelected: (option: UnitOfMeasureOption | null) => void
  onWarehouseSelected: (option: WarehouseOption | null) => void
  onCoverageUnitSelected: (option: UnitOfMeasureOption | null) => void
  onFormulaSelected: (option: ConversionFormulaOption | null) => void
}) {
  return (
    <InventoryFieldGrid>
      {/* Returned Quantity | Unit lead the form (the returned amount + its unit). */}
      <CellAt col={1} row={1} colSpan={2}>
        <FormField label="Returned Quantity" required>
          <NumberCell
            editable={editable}
            value={form.returnedQuantity}
            onChange={(value) => setField("returnedQuantity", value)}
            align="start"
            placeholder="0"
            ariaLabel="Returned quantity"
          />
        </FormField>
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

      {/* Type (locked Increase) | Color — the adjustment's direction + palette tag. */}
      <CellAt col={1} row={2} colSpan={2}>
        <FormField label="Type">
          <SegmentedDropdown
            value="INCREASE"
            onChange={() => {}}
            options={ADJUSTMENT_TYPE_OPTIONS}
            ariaLabel="Adjustment type"
            disabled
          />
        </FormField>
      </CellAt>
      <CellAt col={3} row={2} colSpan={2}>
        <FormField label="Color">
          <PaletteColorDropdown
            value={form.color}
            editable={editable}
            onChange={(color) => setField("color", color)}
            ariaLabel="Return color"
          />
        </FormField>
      </CellAt>

      {/* Area | Waste — adjustment metadata. */}
      <CellAt col={1} row={3} colSpan={2}>
        <FormField
          label="Area"
          currentLength={editable ? form.area.length : undefined}
          maxLength={editable ? INVENTORY_ADJUSTMENT_AREA_MAX : undefined}
        >
          <TextCell
            editable={editable}
            value={form.area}
            onChange={(value) => setField("area", value)}
            placeholder="Area"
            ariaLabel="Return area"
            maxLength={INVENTORY_ADJUSTMENT_AREA_MAX}
          />
        </FormField>
      </CellAt>
      <CellAt col={3} row={3} colSpan={2}>
        <FormField label="Waste">
          <SegmentedChoiceCell
            editable={editable}
            value={form.isWaste ? "WASTE" : "NON_WASTE"}
            options={WASTE_OPTIONS}
            ariaLabel="Waste flag"
            onChange={(next) => setField("isWaste", next === "WASTE")}
          />
        </FormField>
      </CellAt>

      {/* Inventory identity — product / warehouse select the new row's relations. */}
      <CellAt col={1} row={4} colSpan={4}>
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
      <CellAt col={1} row={5} colSpan={4}>
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

      {/* One Location field → stamped onto BOTH the new row and the adjustment. */}
      <CellAt col={1} row={6} colSpan={4}>
        <LocationField
          editable={editable}
          value={form.location}
          onChange={(value) => setField("location", value)}
        />
      </CellAt>

      <CellAt col={1} row={7} colSpan={4}>
        <RollNumberField
          editable={editable}
          value={form.rollNumber}
          onChange={(value) => setField("rollNumber", value)}
        />
      </CellAt>
      <CellAt col={1} row={8} colSpan={4}>
        <DyeLotField
          editable={editable}
          value={form.dyeLot}
          onChange={(value) => setField("dyeLot", value)}
        />
      </CellAt>
      <CellAt col={1} row={9} colSpan={4}>
        <NoteField editable={editable} value={form.note} onChange={(value) => setField("note", value)} />
      </CellAt>

      {/* Conversion feature — formula picker leads the Coverage / Unit pair. */}
      <CellAt col={1} row={10} colSpan={4}>
        <ConversionFormulaPickerField
          value={form.conversionFormulaId || null}
          selectedLabel={conversionFormulaLabel}
          onChange={(id) => setField("conversionFormulaId", id ?? "")}
          onOptionSelected={onFormulaSelected}
          disabled={!editable}
          ariaLabel="Select a conversion formula"
        />
      </CellAt>
      <CellAt col={1} row={11} colSpan={2}>
        <CoveragePerUnitField
          editable={editable}
          value={form.coveragePerUnit}
          onChange={(value) => setField("coveragePerUnit", value)}
        />
      </CellAt>
      <CellAt col={3} row={11} colSpan={2}>
        <CoverageUnitPickerField
          value={form.coverageUnitId || null}
          selectedLabel={coverageUnitLabel}
          onChange={(id) => setField("coverageUnitId", id ?? "")}
          onOptionSelected={onCoverageUnitSelected}
          disabled={!editable}
          placeholder="Select coverage unit"
          ariaLabel="Select a coverage unit"
        />
      </CellAt>
    </InventoryFieldGrid>
  )
}
