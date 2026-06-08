"use client"

import { TextCell } from "@/engines/record-view"
import { StaticFieldValue } from "@/engines/record-view"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { ManufacturerPicker } from "@/modules/manufacturers/components/picker/manufacturer-picker"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import {
  categoryRequiresCoveragePerUnit,
  formatEasternDateTime,
  type ProductCreateForm,
} from "@builders/domain"
import { ProductField } from "./product-field"
import { ProductGroup } from "./product-group"

const PRODUCT_NOTE_MAX = 80

/**
 * Group 1: Details. Editable product identity + spec fields. Laid out
 * as a 2-col grid: Category / Manufacturer, Style / Color, Note /
 * Coverage Per Unit. Category renders as a static read-only value when
 * `categoryReadOnly` is true (record view — category is immutable
 * post-create); the picker is used only on the create flow.
 */
export function ProductDetailsGroup({
  product,
  draft,
  categoryOptions,
  manufacturerName,
  selectedCategory,
  coverageRequired,
  disabled,
  categoryReadOnly,
  fieldsReadOnly,
  onFieldChange,
}: {
  product: ProductRecord
  draft: ProductCreateForm
  categoryOptions: CategoryRecord[]
  manufacturerName: string | null
  selectedCategory: CategoryRecord | null
  coverageRequired: boolean
  disabled: boolean
  categoryReadOnly: boolean
  // When true, the remaining identity/spec cells (manufacturer, style, color,
  // note) render read-only too. Set on the record view — a product row is
  // immutable post-create (deletion only); the create flow leaves this false.
  fieldsReadOnly: boolean
  onFieldChange: (field: keyof ProductCreateForm, value: string) => void
}) {
  const editable = !disabled && !fieldsReadOnly
  return (
    <ProductGroup title="Details">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ProductField label="Category" required={!categoryReadOnly}>
          {categoryReadOnly ? (
            <StaticFieldValue>{product.category.name || "—"}</StaticFieldValue>
          ) : (
            <CategoryPicker
              value={draft.categoryId || null}
              onChange={(nextCategoryId) => {
                onFieldChange("categoryId", nextCategoryId ?? "")
                const nextCategory = nextCategoryId
                  ? categoryOptions.find((category) => category.id === nextCategoryId)
                  : null
                if (nextCategory && !categoryRequiresCoveragePerUnit(nextCategory.slug)) {
                  onFieldChange("coveragePerUnit", "")
                }
              }}
              selectedLabel={selectedCategory?.name ?? null}
              disabled={disabled}
              placeholder="Select a category"
              ariaLabel="Category"
            />
          )}
        </ProductField>
        <ProductField label="Manufacturer">
          {fieldsReadOnly ? (
            <StaticFieldValue>{manufacturerName || "—"}</StaticFieldValue>
          ) : (
            <ManufacturerPicker
              value={draft.manufacturerId || null}
              onChange={(id) => onFieldChange("manufacturerId", id ?? "")}
              selectedLabel={manufacturerName || null}
              disabled={disabled}
              placeholder="Select Manufacturer"
              ariaLabel="Manufacturer"
            />
          )}
        </ProductField>
        <ProductField label="Style">
          {fieldsReadOnly ? (
            <StaticFieldValue>{draft.style || "—"}</StaticFieldValue>
          ) : (
            <TextCell
              editable={editable}
              value={draft.style}
              onChange={(value) => onFieldChange("style", value)}
            />
          )}
        </ProductField>
        <ProductField label="Color">
          {fieldsReadOnly ? (
            <StaticFieldValue>{draft.color || "—"}</StaticFieldValue>
          ) : (
            <TextCell
              editable={editable}
              value={draft.color}
              onChange={(value) => onFieldChange("color", value)}
            />
          )}
        </ProductField>
        <ProductField
          label="Note"
          editable={editable}
          currentLength={draft.note.length}
          maxLength={PRODUCT_NOTE_MAX}
        >
          {fieldsReadOnly ? (
            <StaticFieldValue>{draft.note || "—"}</StaticFieldValue>
          ) : (
            <TextCell
              editable={editable}
              value={draft.note}
              onChange={(value) => onFieldChange("note", value)}
              maxLength={PRODUCT_NOTE_MAX}
            />
          )}
        </ProductField>
        <ProductField
          label="Coverage Per Unit"
          required={!categoryReadOnly && coverageRequired}
        >
          {categoryReadOnly ? (
            // Immutable post-create — coveragePerUnit is snapshotted onto
            // inventory rows, so the record view renders it read-only.
            <StaticFieldValue>
              {draft.coveragePerUnit
                ? `${draft.coveragePerUnit} ${selectedCategory?.itemCoverageUnit ?? "Unit"}`
                : "—"}
            </StaticFieldValue>
          ) : (
            <div
              className={`flex w-full overflow-hidden rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] transition focus-within:border-sky-500/60 focus-within:ring-1 focus-within:ring-sky-500/40 ${coverageRequired ? "" : "opacity-60"}`}
            >
              <input
                value={draft.coveragePerUnit}
                onChange={(event) => onFieldChange("coveragePerUnit", event.target.value)}
                placeholder={coverageRequired ? "0.0000" : "Not applicable for this category"}
                className="min-w-0 flex-1 bg-transparent px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none disabled:cursor-not-allowed"
                disabled={disabled || !coverageRequired}
                aria-required={coverageRequired}
                required={coverageRequired}
              />
              <span className="inline-flex shrink-0 items-center border-l border-[var(--panel-border)] px-3 text-sm text-[var(--foreground)]/70">
                {selectedCategory?.itemCoverageUnit ?? "Unit"}
              </span>
            </div>
          )}
        </ProductField>
        {product.createdAt ? (
          <ProductField label="Created">
            <StaticFieldValue>
              {formatEasternDateTime(product.createdAt) || "—"}
            </StaticFieldValue>
          </ProductField>
        ) : null}
      </div>
    </ProductGroup>
  )
}
