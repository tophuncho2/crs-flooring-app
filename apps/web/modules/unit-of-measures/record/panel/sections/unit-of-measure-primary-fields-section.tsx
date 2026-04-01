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
import { formatStableDateTime } from "@/modules/shared/domain/date-format"
import type { UnitOfMeasureForm, UnitOfMeasureRow } from "../../../domain/types"

export function UnitOfMeasurePrimaryFieldsSection({
  unitOfMeasure,
  draft,
  disabled = false,
  onChange,
}: {
  unitOfMeasure: UnitOfMeasureRow
  draft: UnitOfMeasureForm
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const createdLabel = unitOfMeasure.createdAt ? formatStableDateTime(unitOfMeasure.createdAt) : "Not saved yet"
  const updatedLabel = unitOfMeasure.updatedAt ? formatStableDateTime(unitOfMeasure.updatedAt) : "Not saved yet"

  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="main">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Unit Of Measure">
              <input
                value={draft.name}
                onChange={(event) => onChange(event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="side">
        <RecordPrimaryFieldsGrid variant="side">
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
