"use client"

import {
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
  RecordStaticFieldValue,
} from "@/modules/shared/engines/record-view"
import { formatStableDateTime } from "@builders/domain"
import type { ManufacturerForm, ManufacturerRow } from "@builders/domain"

export function ManufacturerPrimaryFieldsSection({
  manufacturer,
  draft,
  disabled = false,
  onFieldChange,
}: {
  manufacturer: ManufacturerRow
  draft: ManufacturerForm
  disabled?: boolean
  onFieldChange: (field: keyof ManufacturerForm, value: string) => void
}) {
  const createdLabel = manufacturer.createdAt ? formatStableDateTime(manufacturer.createdAt) : "Not saved yet"
  const updatedLabel = manufacturer.updatedAt ? formatStableDateTime(manufacturer.updatedAt) : "Not saved yet"

  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="main">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Company Name">
              <input
                value={draft.companyName}
                onChange={(event) => onFieldChange("companyName", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Agent Name">
              <input
                value={draft.agentName}
                onChange={(event) => onFieldChange("agentName", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Website">
              <input
                value={draft.website}
                onChange={(event) => onFieldChange("website", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Phone">
              <input
                value={draft.phone}
                onChange={(event) => onFieldChange("phone", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Email">
              <input
                value={draft.email}
                onChange={(event) => onFieldChange("email", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="side">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordFormField label="Products">
            <RecordStaticFieldValue>{manufacturer.productsCount}</RecordStaticFieldValue>
          </RecordFormField>
          <RecordFormField label="Created">
            <RecordStaticFieldValue>{createdLabel}</RecordStaticFieldValue>
          </RecordFormField>
          <RecordFormField label="Updated">
            <RecordStaticFieldValue>{updatedLabel}</RecordStaticFieldValue>
          </RecordFormField>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
