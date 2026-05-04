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
import { categoryRequiresCoveragePerUnit, type ProductCreateForm } from "@builders/domain"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import { ManufacturerPicker } from "@/modules/manufacturers/components/picker/manufacturer-picker"

function formatUnit(name: string | null | undefined, abbrev: string | null | undefined) {
  if (!name) return "—"
  return abbrev ? `${name} (${abbrev})` : name
}

export function ProductPrimaryFieldsSection({
  product,
  draft,
  categoryOptions,
  manufacturerName,
  disabled,
  categoryReadOnly = false,
  onFieldChange,
}: {
  product: ProductRecord
  draft: ProductCreateForm
  categoryOptions: CategoryRecord[]
  /**
   * Pre-resolved label for the saved `manufacturerId`, sourced from
   * `product.manufacturerName` (joined snapshot). Empty string on create
   * mode — the picker still works, just renders no trigger label until
   * the user picks one.
   */
  manufacturerName: string | null
  disabled: boolean
  // When true, render the category cell as a static text display sourced from
  // `product.category`. Use on the record view — category is immutable
  // post-create and the lock is enforced at the type system, validator, and
  // domain-rule layers; the UI mirrors that here.
  categoryReadOnly?: boolean
  onFieldChange: (field: keyof ProductCreateForm, value: string) => void
}) {
  const selectedCategory = useMemo(() => {
    if (categoryReadOnly) {
      return (
        categoryOptions.find((category) => category.id === product.category.id) ?? null
      )
    }
    return categoryOptions.find((category) => category.id === draft.categoryId) ?? null
  }, [categoryOptions, categoryReadOnly, draft.categoryId, product.category.id])
  const coverageRequired = categoryRequiresCoveragePerUnit(selectedCategory?.slug)

  // In record-view mode (categoryReadOnly), unit cells display the immutable
  // snapshot stamped on the product row at create — accurate even if a UoM
  // was renamed after the product was created. In create mode, derive live
  // from the chosen category so the cells populate as soon as the user picks.
  const sendUnitDisplay = categoryReadOnly
    ? formatUnit(product.sendUnitName, product.sendUnitAbbrev)
    : formatUnit(selectedCategory?.sendUnit, selectedCategory?.sendUnitAbbrev)
  const stockUnitDisplay = categoryReadOnly
    ? formatUnit(product.stockUnitName, product.stockUnitAbbrev)
    : formatUnit(selectedCategory?.stockUnit, selectedCategory?.stockUnitAbbrev)
  const itemCoverageUnitDisplay = categoryReadOnly
    ? formatUnit(product.itemCoverageUnitName, product.itemCoverageUnitAbbrev)
    : formatUnit(selectedCategory?.itemCoverageUnit, selectedCategory?.itemCoverageUnitAbbrev)

  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="side" placement="left">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordPrimaryFieldCell>
            <RecordFormField label="Category">
              {categoryReadOnly ? (
                <div
                  className={`${RECORD_FIELD_CONTROL_CLASS_NAME} flex items-center text-[var(--foreground)]/80`}
                  aria-readonly="true"
                >
                  {product.category.name || "—"}
                </div>
              ) : (
                <select
                  value={draft.categoryId}
                  onChange={(event) => {
                    const nextCategoryId = event.target.value
                    onFieldChange("categoryId", nextCategoryId)
                    const nextCategory = categoryOptions.find((category) => category.id === nextCategoryId)
                    if (nextCategory && !categoryRequiresCoveragePerUnit(nextCategory.slug)) {
                      onFieldChange("coveragePerUnit", "")
                    }
                  }}
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
              )}
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Send Unit">
              <div
                className={`${RECORD_FIELD_CONTROL_CLASS_NAME} flex items-center text-[var(--foreground)]/80`}
                aria-readonly="true"
              >
                {sendUnitDisplay}
              </div>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Stock Unit">
              <div
                className={`${RECORD_FIELD_CONTROL_CLASS_NAME} flex items-center text-[var(--foreground)]/80`}
                aria-readonly="true"
              >
                {stockUnitDisplay}
              </div>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Item Coverage Unit">
              <div
                className={`${RECORD_FIELD_CONTROL_CLASS_NAME} flex items-center text-[var(--foreground)]/80`}
                aria-readonly="true"
              >
                {itemCoverageUnitDisplay}
              </div>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Manufacturer">
              <ManufacturerPicker
                value={draft.manufacturerId || null}
                onChange={(id) => onFieldChange("manufacturerId", id ?? "")}
                selectedLabel={manufacturerName || null}
                disabled={disabled}
                placeholder="Select Manufacturer"
                ariaLabel="Manufacturer"
              />
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
            <RecordFormField label={coverageRequired ? "Coverage Per Unit *" : "Coverage Per Unit"}>
              <div
                className={`flex w-full overflow-hidden rounded-lg border border-sky-500/35 bg-transparent transition focus-within:border-sky-400/70 focus-within:ring-2 focus-within:ring-sky-500/20 ${coverageRequired ? "" : "opacity-60"}`}
              >
                <input
                  value={draft.coveragePerUnit}
                  onChange={(event) => onFieldChange("coveragePerUnit", event.target.value)}
                  placeholder={coverageRequired ? "0.0000" : "Not applicable for this category"}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[var(--foreground)] outline-none disabled:cursor-not-allowed"
                  disabled={disabled || !coverageRequired}
                  aria-required={coverageRequired}
                  required={coverageRequired}
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
