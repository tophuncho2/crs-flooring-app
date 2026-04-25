"use client"

import {
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RECORD_TEXTAREA_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
} from "@/modules/shared/engines/record-view"
import type { ImportPrimaryForm } from "@builders/domain"
import type { ManufacturerOption, WarehouseOption } from "@/modules/imports/controllers/drafts"

export function ImportPrimaryFieldsSection({
  draft,
  warehouseOptions,
  manufacturerOptions,
  disabled,
  onFieldChange,
}: {
  draft: ImportPrimaryForm
  warehouseOptions: WarehouseOption[]
  manufacturerOptions: ManufacturerOption[]
  disabled: boolean
  onFieldChange: (field: keyof ImportPrimaryForm, value: string) => void
}) {
  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="side" placement="left">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordPrimaryFieldCell>
            <RecordFormField label="Order Number">
              <input
                value={draft.orderNumber}
                onChange={(event) => onFieldChange("orderNumber", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Manufacturer">
              <select
                value={draft.manufacturerId}
                onChange={(event) => onFieldChange("manufacturerId", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              >
                <option value="">Select Manufacturer</option>
                {manufacturerOptions.map((manufacturer) => (
                  <option key={manufacturer.id} value={manufacturer.id}>
                    {manufacturer.label}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="main" placement="right">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Warehouse">
              <select
                value={draft.warehouseId}
                onChange={(event) => onFieldChange("warehouseId", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              >
                <option value="">Select Warehouse</option>
                {warehouseOptions.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Tag">
              <input
                value={draft.tag}
                onChange={(event) => onFieldChange("tag", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Notes">
              <textarea
                value={draft.notes}
                onChange={(event) => onFieldChange("notes", event.target.value)}
                rows={3}
                className={RECORD_TEXTAREA_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
