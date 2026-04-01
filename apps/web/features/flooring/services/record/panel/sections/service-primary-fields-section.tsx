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
import { formatStableDateTime } from "@/features/flooring/shared/date-format"
import type { ServiceForm, ServiceRow, UnitOption } from "../../../domain/types"

export function ServicePrimaryFieldsSection({
  service,
  draft,
  unitOptions,
  disabled = false,
  onFieldChange,
}: {
  service: ServiceRow
  draft: ServiceForm
  unitOptions: UnitOption[]
  disabled?: boolean
  onFieldChange: (field: keyof ServiceForm, value: string) => void
}) {
  const createdLabel = service.createdAt ? formatStableDateTime(service.createdAt) : "Not saved yet"
  const updatedLabel = service.updatedAt ? formatStableDateTime(service.updatedAt) : "Not saved yet"

  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="main">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Service Name">
              <input
                value={draft.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Service Unit">
              <select
                value={draft.unitId}
                onChange={(event) => onFieldChange("unitId", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              >
                <option value="">Select unit</option>
                {unitOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Cost">
              <input
                value={draft.baseCost}
                onChange={(event) => onFieldChange("baseCost", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Notes">
              <textarea
                value={draft.notes}
                onChange={(event) => onFieldChange("notes", event.target.value)}
                disabled={disabled}
                className={`${RECORD_FIELD_CONTROL_CLASS_NAME} min-h-[120px]`}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="side">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordFormField label="Usage">
            <RecordStaticFieldValue>{service.usageCount}</RecordStaticFieldValue>
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
