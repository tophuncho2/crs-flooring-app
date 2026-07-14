"use client"

import {
  FormField,
  MoneyCell,
  NumberCell,
  StatCell,
  StaticFieldValue,
  TextareaCell,
  TextCell,
} from "@/engines/record-view"
import { CellChip, PaletteColorDropdown } from "@/engines/common"
import {
  formatEasternDateTime,
  formatInventoryQuantity,
  formatMoney,
  INVENTORY_DYE_LOT_MAX,
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
  type PaletteColor,
} from "@builders/domain"
import { ProductPicker, type ProductPickerProps } from "@/modules/products/components/picker/product-picker"
import {
  UnitOfMeasurePicker,
  type UnitOfMeasurePickerProps,
} from "@/modules/unit-of-measures/components/picker/unit-of-measure-picker"
import {
  ConversionFormulaPicker,
  type ConversionFormulaPickerProps,
} from "@/modules/conversion-formulas/components/picker/conversion-formula-picker"
import { WarehousePicker, type WarehousePickerProps } from "@/modules/warehouse/components/picker/warehouse-picker"
import { InventoryArchiveChip } from "../primary/controls/inventory-archive-chip"

/**
 * The inventory cell vocabulary — one labelled, engine-formatted component per
 * inventory field. Each bundles the record-view engine's `FormField` with the
 * correct cell, the field's domain `maxLength`, counter gating, and aria, so the
 * *format* of every inventory cell is single-sourced. The record view, create
 * form, and duplicate form all compose these (none adds or removes a field).
 *
 * Placement is left to the call site: render these inside `<CellAt col colSpan>`
 * within an `<InventoryFieldGrid>`.
 */

type TextFieldProps = {
  editable: boolean
  value: string
  onChange: (value: string) => void
}

export function LocationField({ editable, value, onChange }: TextFieldProps) {
  return (
    <FormField label="Location">
      <TextCell editable={editable} value={value} onChange={onChange} maxLength={INVENTORY_LOCATION_MAX} />
    </FormField>
  )
}

export function InternalNotesField({ editable, value, onChange }: TextFieldProps) {
  return (
    <FormField
      label="Internal Notes"
      // Counter only in edit mode — mirrors the retired InventoryField, since the
      // engine FormField would otherwise show it in read-only mode too.
      currentLength={editable ? value.length : undefined}
      maxLength={editable ? INVENTORY_INTERNAL_NOTES_MAX : undefined}
    >
      <TextareaCell
        editable={editable}
        value={value}
        onChange={onChange}
        maxLength={INVENTORY_INTERNAL_NOTES_MAX}
        rows={1}
      />
    </FormField>
  )
}

export function RollNumberField({ editable, value, onChange }: TextFieldProps) {
  return (
    <FormField label="Roll #">
      <TextCell editable={editable} value={value} onChange={onChange} maxLength={INVENTORY_ROLL_NUMBER_MAX} />
    </FormField>
  )
}

export function DyeLotField({ editable, value, onChange }: TextFieldProps) {
  return (
    <FormField label="Dye Lot">
      <TextCell editable={editable} value={value} onChange={onChange} maxLength={INVENTORY_DYE_LOT_MAX} />
    </FormField>
  )
}

export function NoteField({ editable, value, onChange }: TextFieldProps) {
  return (
    <FormField label="Note">
      <TextCell editable={editable} value={value} onChange={onChange} maxLength={INVENTORY_NOTE_MAX} />
    </FormField>
  )
}

export function StartingStockField({
  editable,
  value,
  onChange,
  required,
}: TextFieldProps & { required?: boolean }) {
  // No unit suffix: the Unit picker sits directly beside this cell on the create
  // form, so the abbreviation next to the number would be redundant.
  return (
    <FormField label="Starting Stock" required={required}>
      <NumberCell
        editable={editable}
        value={value}
        onChange={onChange}
        align="start"
        placeholder="0.00"
        ariaLabel="Starting stock"
      />
    </FormField>
  )
}

export function CostField({ editable, value, onChange }: TextFieldProps) {
  return (
    <FormField label="Cost">
      <MoneyCell editable={editable} value={value} onChange={onChange} ariaLabel="Cost" />
    </FormField>
  )
}

export function FreightField({ editable, value, onChange }: TextFieldProps) {
  return (
    <FormField label="Freight">
      <MoneyCell editable={editable} value={value} onChange={onChange} ariaLabel="Freight" />
    </FormField>
  )
}

export function StatusField({
  editable,
  value,
  onChange,
}: {
  editable: boolean
  value: boolean
  onChange: (next: boolean) => void
}) {
  return (
    <FormField label="Status">
      <InventoryArchiveChip value={value} onChange={onChange} disabled={!editable} />
    </FormField>
  )
}

export function ColorField({
  editable,
  value,
  onChange,
}: {
  editable: boolean
  value: PaletteColor
  onChange: (next: PaletteColor) => void
}) {
  return (
    <FormField label="Color">
      <PaletteColorDropdown
        value={value}
        editable={editable}
        onChange={onChange}
        ariaLabel="Inventory color"
      />
    </FormField>
  )
}

export function WarehouseStaticField({ warehouseName }: { warehouseName: string | null }) {
  return (
    <FormField label="Warehouse">
      <StaticFieldValue>{warehouseName || "—"}</StaticFieldValue>
    </FormField>
  )
}

export function ProductPickerField({ required, ...props }: ProductPickerProps & { required?: boolean }) {
  return (
    <FormField label="Product" required={required}>
      <ProductPicker {...props} />
    </FormField>
  )
}

export function UnitPickerField({
  required,
  ...props
}: UnitOfMeasurePickerProps & { required?: boolean }) {
  return (
    <FormField label="Unit" required={required}>
      <UnitOfMeasurePicker {...props} />
    </FormField>
  )
}

export function WarehousePickerField({
  required,
  ...props
}: WarehousePickerProps & { required?: boolean }) {
  return (
    <FormField label="Warehouse" required={required}>
      <WarehousePicker {...props} />
    </FormField>
  )
}

// --- Conversion feature: editable coverage/formula cells + read-only output ---

export function CoverageUnitPickerField(props: UnitOfMeasurePickerProps) {
  return (
    <FormField label="Coverage Unit">
      <UnitOfMeasurePicker {...props} />
    </FormField>
  )
}

export function CoveragePerUnitField({ editable, value, onChange }: TextFieldProps) {
  return (
    <FormField label="Coverage / Unit">
      <NumberCell
        editable={editable}
        value={value}
        onChange={onChange}
        align="start"
        placeholder="0"
        ariaLabel="Coverage per unit"
      />
    </FormField>
  )
}

export function ConversionFormulaPickerField(props: ConversionFormulaPickerProps) {
  return (
    <FormField label="Conversion Formula">
      <ConversionFormulaPicker {...props} />
    </FormField>
  )
}

/**
 * Read-only derived converted balance (e.g. "5 boxes"). Blank when the formula/
 * coverage inputs don't resolve — never a misleading number. Display-only.
 */
export function ConvertedBalanceField({
  value,
  unitAbbrev,
}: {
  value: string
  unitAbbrev: string
}) {
  return (
    <FormField label="Converted">
      <StaticFieldValue>
        {value ? formatInventoryQuantity(value, unitAbbrev) : "—"}
      </StaticFieldValue>
    </FormField>
  )
}

/**
 * Read-only "reference" cells — the inventory table columns surfaced on the
 * record view as display-only cells (uneditable for now). Each pulls straight
 * from the persisted `InventoryRow` and renders inside the engine's boxed
 * read-only field UI (`StaticFieldValue`) — the same encasing treatment as
 * `WarehouseStaticField` here and the entity property read-only cells. Values are
 * formatted with the same domain formatters the inventory table row uses.
 */

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <FormField label={label}>
      <StaticFieldValue>{value || "—"}</StaticFieldValue>
    </FormField>
  )
}

// Stock + Deducted are the headline figures of the record — they wear the
// prominent record-view StatCell (the same big number/box the job-type +
// warehouse statistics cells use), fed a preformatted quantity so the exact
// decimals + unit survive.
export function StockBalanceField({ value, unitAbbrev }: { value: string; unitAbbrev: string }) {
  return (
    <FormField label="Stock">
      <StatCell display={formatInventoryQuantity(value, unitAbbrev)} ariaLabel="Stock balance" />
    </FormField>
  )
}

export function NetDeductedField({ value, unitAbbrev }: { value: string; unitAbbrev: string }) {
  return (
    <FormField label="Deducted">
      <StatCell display={formatInventoryQuantity(value, unitAbbrev)} ariaLabel="Net deducted" />
    </FormField>
  )
}

export function StartingStockReadonlyField({ value, unitAbbrev }: { value: string; unitAbbrev: string }) {
  return <ReadonlyField label="Starting" value={formatInventoryQuantity(value, unitAbbrev)} />
}

export function CostReadonlyField({ value }: { value: string }) {
  return <ReadonlyField label="Cost" value={formatMoney(value)} />
}

export function FreightReadonlyField({ value }: { value: string }) {
  return <ReadonlyField label="Freight" value={formatMoney(value)} />
}

export function ProductNameField({ value }: { value: string }) {
  return <ReadonlyField label="Product" value={value} />
}

export function InventoryNumberField({
  value,
  paletteColor,
}: {
  value: string
  // When supplied, the inv# renders inside a live-recoloring palette chip
  // (driven by the draft color) instead of the plain read-only value.
  paletteColor?: PaletteColor
}) {
  if (paletteColor === undefined) {
    return <ReadonlyField label="Inv #" value={value} />
  }
  return (
    <FormField label="Inv #">
      <CellChip paletteColor={paletteColor}>{value}</CellChip>
    </FormField>
  )
}

export function RollNumberReadOnlyField({ value }: { value: string }) {
  return <ReadonlyField label="Roll #" value={value} />
}

export function DyeLotReadOnlyField({ value }: { value: string }) {
  return <ReadonlyField label="Dye Lot" value={value} />
}

export function NoteReadOnlyField({ value }: { value: string }) {
  return <ReadonlyField label="Note" value={value} />
}

export function CategoryNameField({ value }: { value: string }) {
  return <ReadonlyField label="Category" value={value} />
}

export function PurchaseOrderNumberField({ value }: { value: string }) {
  return <ReadonlyField label="PO #" value={value} />
}

export function ImportNumberField({ value }: { value: number | null }) {
  return <ReadonlyField label="Import #" value={value != null ? String(value) : "-"} />
}

export function CreatedAtField({ value }: { value: string }) {
  return <ReadonlyField label="Created" value={formatEasternDateTime(value)} />
}

export function UpdatedAtField({ value }: { value: string }) {
  return <ReadonlyField label="Updated" value={formatEasternDateTime(value)} />
}

export function CreatedByField({ value }: { value: string | null }) {
  return <ReadonlyField label="Created by" value={value ?? "—"} />
}

export function UpdatedByField({ value }: { value: string | null }) {
  return <ReadonlyField label="Updated by" value={value ?? "—"} />
}

