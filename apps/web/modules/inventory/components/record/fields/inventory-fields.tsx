"use client"

import {
  FormField,
  MoneyCell,
  StaticFieldValue,
  TextareaCell,
  TextCell,
  UnitCell,
} from "@/engines/record-view"
import { StatusBadge } from "@/engines/common"
import {
  formatEasternDateTime,
  formatFifoReceivedAtEastern,
  formatInventoryQuantity,
  formatMoney,
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
 * from the persisted `InventoryRow` and renders inside the engine's boxed
 * read-only field UI (`StaticFieldValue`) — the same encasing treatment as
 * `WarehouseStaticField` here and the MC property read-only cells. Values are
 * formatted with the same domain formatters the inventory table row uses.
 */

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <FormField label={label}>
      <StaticFieldValue>{value || "—"}</StaticFieldValue>
    </FormField>
  )
}

export function StockBalanceField({ value, unitAbbrev }: { value: string; unitAbbrev: string }) {
  return <ReadonlyField label="Stock" value={formatInventoryQuantity(value, unitAbbrev)} />
}

export function NetDeductedField({ value, unitAbbrev }: { value: string; unitAbbrev: string }) {
  return <ReadonlyField label="Deducted" value={formatInventoryQuantity(value, unitAbbrev)} />
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

export function InventoryNumberField({ value }: { value: string }) {
  return <ReadonlyField label="Inv #" value={value} />
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

export function ImportNumberField({ value }: { value: string }) {
  return <ReadonlyField label="Import #" value={value} />
}

export function FifoReceivedField({ value }: { value: string }) {
  return <ReadonlyField label="FIFO Received" value={formatFifoReceivedAtEastern(value)} />
}

export function CreatedAtField({ value }: { value: string }) {
  return <ReadonlyField label="Created" value={formatEasternDateTime(value)} />
}

export function UpdatedAtField({ value }: { value: string }) {
  return <ReadonlyField label="Updated" value={formatEasternDateTime(value)} />
}

export function MergedField({ wasMerged }: { wasMerged: boolean }) {
  return (
    <FormField label="Merged">
      <StaticFieldValue>
        {wasMerged ? (
          <StatusBadge tone="warning" size="sm">
            Merged
          </StatusBadge>
        ) : (
          "—"
        )}
      </StaticFieldValue>
    </FormField>
  )
}
