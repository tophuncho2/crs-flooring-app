"use client"

import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
import { TextCell, TextareaCell } from "@/components/cells"
import { ManufacturerPicker } from "@/modules/manufacturers/components/picker/manufacturer-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import type { ImportPrimaryForm } from "@builders/domain"

export function ImportPrimaryFieldsSection({
  draft,
  warehouseName,
  manufacturerName,
  disabled,
  onFieldChange,
}: {
  draft: ImportPrimaryForm
  warehouseName: string | null
  manufacturerName: string | null
  disabled: boolean
  onFieldChange: (field: keyof ImportPrimaryForm, value: string) => void
}) {
  const editable = !disabled

  return (
    <FieldSection>
      <CellAt col={1} colSpan={2}>
        <FormField label="Order Number">
          <TextCell
            editable={editable}
            value={draft.orderNumber}
            onChange={(value) => onFieldChange("orderNumber", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={3} colSpan={2}>
        <FormField label="Warehouse" required>
          {editable ? (
            <WarehousePicker
              value={draft.warehouseId || null}
              onChange={(id) => onFieldChange("warehouseId", id ?? "")}
              selectedLabel={warehouseName || null}
              placeholder="Select Warehouse"
              ariaLabel="Warehouse"
            />
          ) : (
            <StaticFieldValue>{warehouseName || "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={2}>
        <FormField label="Manufacturer">
          {editable ? (
            <ManufacturerPicker
              value={draft.manufacturerId || null}
              onChange={(id) => onFieldChange("manufacturerId", id ?? "")}
              selectedLabel={manufacturerName || null}
              placeholder="Select Manufacturer"
              ariaLabel="Manufacturer"
            />
          ) : (
            <StaticFieldValue>{manufacturerName || "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <FormField label="Notes">
          <TextareaCell
            editable={editable}
            value={draft.notes}
            onChange={(value) => onFieldChange("notes", value)}
            rows={3}
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
