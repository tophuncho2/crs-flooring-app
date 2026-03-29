"use client"

import {
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
  RecordStaticFieldValue,
} from "@/features/shared/engines/record-view"
import { formatStableDateTime } from "@/features/flooring/shared/utils/date-format"
import type { ManufacturerForm, ManufacturerRow } from "../../../domain/types"

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
            <RecordStaticFieldValue>{formatStableDateTime(manufacturer.createdAt)}</RecordStaticFieldValue>
          </RecordFormField>
          <RecordFormField label="Updated">
            <RecordStaticFieldValue>{formatStableDateTime(manufacturer.updatedAt)}</RecordStaticFieldValue>
          </RecordFormField>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
