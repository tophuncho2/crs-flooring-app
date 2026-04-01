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
import type { CategoryForm, CategoryRow, UnitOfMeasureOption } from "../../../domain/types"

function CategoryUnitSelect({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string
  value: string
  options: UnitOfMeasureOption[]
  disabled?: boolean
  onChange: (value: string) => void
}) {
  return (
    <RecordFormField label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={RECORD_FIELD_CONTROL_CLASS_NAME}
      >
        <option value="">None</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </RecordFormField>
  )
}

export function CategoryPrimaryFieldsSection({
  category,
  draft,
  unitOfMeasureOptions,
  disabled = false,
  onFieldChange,
}: {
  category: CategoryRow
  draft: CategoryForm
  unitOfMeasureOptions: UnitOfMeasureOption[]
  disabled?: boolean
  onFieldChange: (field: keyof CategoryForm, value: string) => void
}) {
  const createdLabel = category.createdAt ? formatStableDateTime(category.createdAt) : "Not saved yet"
  const updatedLabel = category.updatedAt ? formatStableDateTime(category.updatedAt) : "Not saved yet"

  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="main">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Category Name">
              <input
                value={draft.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                disabled={disabled}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <CategoryUnitSelect
              label="Send Unit"
              value={draft.sendUnitId}
              options={unitOfMeasureOptions}
              disabled={disabled}
              onChange={(value) => onFieldChange("sendUnitId", value)}
            />
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <CategoryUnitSelect
              label="Stock Unit"
              value={draft.stockUnitId}
              options={unitOfMeasureOptions}
              disabled={disabled}
              onChange={(value) => onFieldChange("stockUnitId", value)}
            />
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <CategoryUnitSelect
              label="Coverage Available Unit"
              value={draft.coverageAvailableUnitId}
              options={unitOfMeasureOptions}
              disabled={disabled}
              onChange={(value) => onFieldChange("coverageAvailableUnitId", value)}
            />
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <CategoryUnitSelect
              label="Item Coverage Unit"
              value={draft.itemCoverageUnitId}
              options={unitOfMeasureOptions}
              disabled={disabled}
              onChange={(value) => onFieldChange("itemCoverageUnitId", value)}
            />
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <CategoryUnitSelect
              label="Service Unit"
              value={draft.serviceUnitId}
              options={unitOfMeasureOptions}
              disabled={disabled}
              onChange={(value) => onFieldChange("serviceUnitId", value)}
            />
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
