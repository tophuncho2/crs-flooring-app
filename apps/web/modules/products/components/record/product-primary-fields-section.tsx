"use client"

import { useMemo } from "react"
import {
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RECORD_TEXTAREA_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
} from "@/modules/shared/engines/record-view"
import type { ProductForm } from "@builders/domain"
import type { CategoryRecord, ManufacturerRecord, ProductRecord } from "@builders/db"

export function ProductPrimaryFieldsSection({
  draft,
  categoryOptions,
  manufacturerOptions,
  disabled,
  onFieldChange,
}: {
  product: ProductRecord
  draft: ProductForm
  categoryOptions: CategoryRecord[]
  manufacturerOptions: ManufacturerRecord[]
  disabled: boolean
  onFieldChange: (field: keyof ProductForm, value: string) => void
}) {
  const selectedCategory = useMemo(
    () => categoryOptions.find((category) => category.id === draft.categoryId) ?? null,
    [categoryOptions, draft.categoryId],
  )

  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="side" placement="left">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordPrimaryFieldCell>
            <RecordFormField label="Category">
              <select
                value={draft.categoryId}
                onChange={(event) => onFieldChange("categoryId", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              >
                <option value="">Select a category</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
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
                <option value="">Select a manufacturer</option>
                {manufacturerOptions.map((manufacturer) => (
                  <option key={manufacturer.id} value={manufacturer.id}>
                    {manufacturer.companyName}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Style">
              <input
                value={draft.style}
                onChange={(event) => onFieldChange("style", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Color">
              <input
                value={draft.color}
                onChange={(event) => onFieldChange("color", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Coverage Per Unit">
              <div className="flex w-full overflow-hidden rounded-lg border border-sky-500/35 bg-transparent transition focus-within:border-sky-400/70 focus-within:ring-2 focus-within:ring-sky-500/20">
                <input
                  value={draft.coveragePerUnit}
                  onChange={(event) => onFieldChange("coveragePerUnit", event.target.value)}
                  placeholder="0.0000"
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[var(--foreground)] outline-none"
                  disabled={disabled}
                />
                <span className="inline-flex shrink-0 items-center border-l border-sky-500/35 px-3 text-[var(--foreground)]/70">
                  {selectedCategory?.itemCoverageUnit ?? "Unit"}
                </span>
              </div>
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="main" placement="right">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Thickness">
              <input
                value={draft.thickness}
                onChange={(event) => onFieldChange("thickness", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Width">
              <input
                value={draft.width}
                onChange={(event) => onFieldChange("width", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Unit Weight">
              <input
                value={draft.unitWeight}
                onChange={(event) => onFieldChange("unitWeight", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Sheet Size">
              <input
                value={draft.sheetSize}
                onChange={(event) => onFieldChange("sheetSize", event.target.value)}
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
                rows={4}
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
