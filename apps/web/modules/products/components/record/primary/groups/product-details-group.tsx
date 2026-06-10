"use client"

import { TextCell } from "@/engines/record-view"
import { StaticFieldValue } from "@/engines/record-view"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { ManufacturerPicker } from "@/modules/manufacturers/components/picker/manufacturer-picker"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import {
  formatEasternDateTime,
  type ProductCreateForm,
} from "@builders/domain"
import { ProductField } from "./product-field"
import { ProductGroup } from "./product-group"

const PRODUCT_NOTE_MAX = 80

/**
 * Group 1: Details. Editable product identity + spec fields. Laid out
 * as a 2-col grid: Category / Manufacturer, Style / Color, Note.
 * Category renders as a static read-only value when
 * `categoryReadOnly` is true (record view — category is immutable
 * post-create); the picker is used only on the create flow.
 */
export function ProductDetailsGroup({
  product,
  draft,
  manufacturerName,
  selectedCategory,
  disabled,
  categoryReadOnly,
  fieldsReadOnly,
  onFieldChange,
}: {
  product: ProductRecord
  draft: ProductCreateForm
  manufacturerName: string | null
  selectedCategory: CategoryRecord | null
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
          className="md:col-span-2"
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
