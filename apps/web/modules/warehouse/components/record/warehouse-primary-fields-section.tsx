"use client"

import {
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RECORD_TEXTAREA_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
  RecordStaticFieldValue,
} from "@/modules/shared/engines/record-view"
import type { WarehouseForm } from "@builders/domain"
import type { WarehouseDetail } from "@/modules/warehouse/types"

function formatDate(value: string) {
  if (!value) {
    return "-"
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toISOString().slice(0, 10)
}

export function WarehousePrimaryFieldsSection({
  warehouse,
  draft,
  disabled,
  onFieldChange,
}: {
  warehouse: WarehouseDetail
  draft: WarehouseForm
  disabled: boolean
  onFieldChange: (field: keyof WarehouseForm, value: string) => void
}) {
  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="side" placement="left">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordPrimaryFieldCell>
            <RecordFormField label="Sections">
              <RecordStaticFieldValue>{warehouse.sectionsCount}</RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Locations">
              <RecordStaticFieldValue>{warehouse.locationsCount}</RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Work Orders">
              <RecordStaticFieldValue>{warehouse.workOrdersCount}</RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Updated">
              <RecordStaticFieldValue>{formatDate(warehouse.updatedAt)}</RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="main" placement="right">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Warehouse Name">
              <input
                value={draft.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Store Phone">
              <input
                value={draft.phone}
                onChange={(event) => onFieldChange("phone", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Address">
              <textarea
                value={draft.address}
                onChange={(event) => onFieldChange("address", event.target.value)}
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
