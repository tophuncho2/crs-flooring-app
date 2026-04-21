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
import {
  IMPORT_STATUS_OPTIONS,
  IMPORT_TRANSPORT_TYPE_OPTIONS,
  getImportStatusFieldClass,
  getTransportTypeFieldClass,
} from "../../formatters"
import type { ImportDetail as ImportRow, ImportPrimaryForm } from "@builders/domain"
import type { WarehouseOption } from "@/modules/imports/controllers/drafts"

export function ImportPrimaryFieldsSection({
  entry,
  draft,
  warehouseOptions,
  disabled,
  onFieldChange,
}: {
  entry: ImportRow
  draft: ImportPrimaryForm
  warehouseOptions: WarehouseOption[]
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
            <RecordFormField label="Transport Type">
              <select
                value={draft.transportType}
                onChange={(event) => onFieldChange("transportType", event.target.value)}
                className={`${RECORD_FIELD_CONTROL_CLASS_NAME} ${getTransportTypeFieldClass(draft.transportType)}`}
                disabled={disabled}
              >
                {IMPORT_TRANSPORT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Import Status">
              <select
                value={draft.status}
                onChange={(event) => onFieldChange("status", event.target.value)}
                className={`${RECORD_FIELD_CONTROL_CLASS_NAME} ${getImportStatusFieldClass(draft.status)}`}
                disabled={disabled}
              >
                {IMPORT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Total Cost">
              <div className={RECORD_FIELD_CONTROL_CLASS_NAME}>{entry.totalCostLabel}</div>
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
