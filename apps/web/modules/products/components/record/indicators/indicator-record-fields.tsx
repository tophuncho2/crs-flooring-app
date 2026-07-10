"use client"

import {
  CellAt,
  FieldSection,
  FormField,
  NumberCell,
  StaticFieldValue,
  TextareaCell,
  ToggleCell,
} from "@/engines/record-view"
import { IndicatorStatusChip } from "@/modules/inventory-indicators"
import {
  INVENTORY_INDICATOR_INTERNAL_NOTES_MAX,
  type InventoryIndicatorRow,
  type InventoryIndicatorUpdateForm,
} from "@builders/domain"

/**
 * The indicator edit form fields. The identity triple (warehouse / unit) + the
 * derived status + live on-hand are read-only; only the low-stock threshold,
 * notes, and the active toggle are editable.
 */
export function IndicatorRecordFields({
  row,
  form,
  editable,
  onFieldChange,
}: {
  row: InventoryIndicatorRow
  form: InventoryIndicatorUpdateForm
  editable: boolean
  onFieldChange: <K extends keyof InventoryIndicatorUpdateForm>(
    field: K,
    value: InventoryIndicatorUpdateForm[K],
  ) => void
}) {
  const onHand = `${row.currentStock}${row.unitAbbrev ? ` ${row.unitAbbrev}` : ""}`
  return (
    <FieldSection>
      <CellAt col={1} colSpan={4}>
        <FormField label="Warehouse">
          <StaticFieldValue>{row.warehouseName || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Unit">
          <StaticFieldValue>{row.unitAbbrev || row.unitName || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Status">
          <IndicatorStatusChip status={row.status} label={row.statusLabel} />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="On Hand">
          <StaticFieldValue>{onHand}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <FormField label="Low Threshold">
          <NumberCell
            editable={editable}
            value={form.lowStockThreshold}
            onChange={(value) => onFieldChange("lowStockThreshold", value)}
            ariaLabel="Low stock threshold"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Active">
          <ToggleCell
            editable={editable}
            value={form.isActive}
            onChange={(value) => onFieldChange("isActive", value)}
            ariaLabel="Indicator active"
          />
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField
          label="Notes"
          currentLength={editable ? form.internalNotes.length : undefined}
          maxLength={editable ? INVENTORY_INDICATOR_INTERNAL_NOTES_MAX : undefined}
        >
          <TextareaCell
            editable={editable}
            value={form.internalNotes}
            onChange={(value) => onFieldChange("internalNotes", value)}
            maxLength={INVENTORY_INDICATOR_INTERNAL_NOTES_MAX}
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
