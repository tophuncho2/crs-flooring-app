"use client"

import { FormField, StaticFieldValue, StatusCell, TextCell, UnitCell } from "@/engines/record-view"
import {
  formatEasternDateTime,
  formatFifoReceivedAtEastern,
  INVENTORY_DYE_LOT_MAX,
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
} from "@builders/domain"
import { ProductPicker, type ProductPickerProps } from "@/modules/products/components/picker/product-picker"
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
      <TextCell editable={editable} value={value} onChange={onChange} maxLength={INVENTORY_INTERNAL_NOTES_MAX} />
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
  unit,
}: TextFieldProps & { unit: string }) {
  return (
    <FormField label="Starting Stock">
      <UnitCell
        editable={editable}
        value={value}
        onChange={onChange}
        unit={unit}
        align="start"
        placeholder="0.00"
        ariaLabel="Starting stock"
      />
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

export function WarehouseStaticField({ warehouseName }: { warehouseName: string | null }) {
  return (
    <FormField label="Warehouse">
      <StaticFieldValue>{warehouseName || "—"}</StaticFieldValue>
    </FormField>
  )
}

export function ProductPickerField(props: ProductPickerProps) {
  return (
    <FormField label="Product">
      <ProductPicker {...props} />
    </FormField>
  )
}

export function WarehousePickerField(props: WarehousePickerProps) {
  return (
    <FormField label="Warehouse">
      <WarehousePicker {...props} />
    </FormField>
  )
}

/**
 * Read-only "reference" cells — the inventory table columns surfaced on the
 * record view as display-only cells (uneditable for now). Each pulls straight
 * from the persisted `InventoryRow` and is formatted to read identically to the
 * inventory table row (same domain formatters the row renderer uses).
 */

function ReadonlyTextField({ label, value }: { label: string; value: string }) {
  return (
    <FormField label={label}>
      <TextCell editable={false} value={value} />
    </FormField>
  )
}

function ReadonlyUnitField({
  label,
  value,
  unitAbbrev,
}: {
  label: string
  value: string
  unitAbbrev: string
}) {
  return (
    <FormField label={label}>
      <UnitCell editable={false} value={value} unit={unitAbbrev} align="start" />
    </FormField>
  )
}

export function StockBalanceField({ value, unitAbbrev }: { value: string; unitAbbrev: string }) {
  return <ReadonlyUnitField label="Stock" value={value} unitAbbrev={unitAbbrev} />
}

export function NetDeductedField({ value, unitAbbrev }: { value: string; unitAbbrev: string }) {
  return <ReadonlyUnitField label="Deducted" value={value} unitAbbrev={unitAbbrev} />
}

export function StartingStockReadonlyField({ value, unitAbbrev }: { value: string; unitAbbrev: string }) {
  return <ReadonlyUnitField label="Starting" value={value} unitAbbrev={unitAbbrev} />
}

export function ProductNameField({ value }: { value: string }) {
  return <ReadonlyTextField label="Product" value={value} />
}

export function InventoryNumberField({ value }: { value: string }) {
  return <ReadonlyTextField label="Inv #" value={value} />
}

export function CategoryNameField({ value }: { value: string }) {
  return <ReadonlyTextField label="Category" value={value} />
}

export function PurchaseOrderNumberField({ value }: { value: string }) {
  return <ReadonlyTextField label="PO #" value={value} />
}

export function ImportNumberField({ value }: { value: string }) {
  return <ReadonlyTextField label="Import #" value={value} />
}

export function FifoReceivedField({ value }: { value: string }) {
  return <ReadonlyTextField label="FIFO Received" value={formatFifoReceivedAtEastern(value)} />
}

export function UpdatedAtField({ value }: { value: string }) {
  return <ReadonlyTextField label="Updated" value={formatEasternDateTime(value)} />
}

export function MergedField({ wasMerged }: { wasMerged: boolean }) {
  return (
    <FormField label="Merged">
      {wasMerged ? (
        <StatusCell editable={false} value="Merged" badgeTone="warning" />
      ) : (
        <StaticFieldValue>-</StaticFieldValue>
      )}
    </FormField>
  )
}
