"use client"

import { RecordFormField } from "@/features/flooring/shared/ui/forms/record-form"
import type { CategoryForm, UnitOfMeasureOption } from "../domain/types"

function UnitSelect({
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
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 disabled:opacity-70">
        <option value="">None</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>{option.name}</option>
        ))}
      </select>
    </RecordFormField>
  )
}

export function CategoryFormFields({
  draft,
  options,
  disabled = false,
  onFieldChange,
}: {
  draft: CategoryForm
  options: UnitOfMeasureOption[]
  disabled?: boolean
  onFieldChange: (field: keyof CategoryForm, value: string) => void
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <RecordFormField label="Category Name">
        <input value={draft.name} onChange={(event) => onFieldChange("name", event.target.value)} disabled={disabled} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 disabled:opacity-70" />
      </RecordFormField>
      <UnitSelect label="Send Unit" value={draft.sendUnitId} options={options} disabled={disabled} onChange={(value) => onFieldChange("sendUnitId", value)} />
      <UnitSelect label="Stock Unit" value={draft.stockUnitId} options={options} disabled={disabled} onChange={(value) => onFieldChange("stockUnitId", value)} />
      <UnitSelect label="Coverage Available Unit" value={draft.coverageAvailableUnitId} options={options} disabled={disabled} onChange={(value) => onFieldChange("coverageAvailableUnitId", value)} />
      <UnitSelect label="Item Coverage Unit" value={draft.itemCoverageUnitId} options={options} disabled={disabled} onChange={(value) => onFieldChange("itemCoverageUnitId", value)} />
      <UnitSelect label="Service Unit" value={draft.serviceUnitId} options={options} disabled={disabled} onChange={(value) => onFieldChange("serviceUnitId", value)} />
    </div>
  )
}
