"use client"

import { useMemo } from "react"
import {
  CellAt,
  FieldSection,
  FormField,
  PerUnitCell,
  StaticFieldValue,
  TextCell,
} from "@/engines/record-view"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { ManufacturerPicker } from "@/modules/manufacturers/components/picker/manufacturer-picker"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import {
  formatEasternDateTime,
  type ProductCreateForm,
} from "@builders/domain"

const PRODUCT_NAMING_ADDON_MAX = 80

function formatUnit(name: string | null | undefined, abbrev: string | null | undefined) {
  if (!name) return "—"
  return abbrev ? `${name} (${abbrev})` : name
}

/**
 * Products primary section, on the canonical record-view invisible grid.
 * One `FieldSection` (8-col `LayoutGrid`) places every cell with `CellAt`,
 * mirroring `properties/.../property-fields-section.tsx`. The former
 * Details / Units card groupings are gone — identity/spec fields and the
 * read-only unit snapshots flow as one continuous grid.
 *
 * `categoryReadOnly` renders Category as a static value (immutable
 * post-create; enforced at the type/validator/domain layers). `fieldsReadOnly`
 * renders the remaining identity/spec cells (manufacturer, style, color, naming addon)
 * read-only too — set on the record view, left false on the create flow.
 */
export function ProductPrimaryFieldsSection({
  product,
  draft,
  categoryOptions,
  manufacturerName,
  disabled,
  categoryReadOnly = false,
  fieldsReadOnly = false,
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
  categoryReadOnly?: boolean
  fieldsReadOnly?: boolean
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

  const editable = !disabled && !fieldsReadOnly

  const stockUnitDisplay = categoryReadOnly
    ? formatUnit(product.stockUnitName, product.stockUnitAbbrev)
    : formatUnit(selectedCategory?.stockUnit, selectedCategory?.stockUnitAbbrev)
  const coverageUnitAbbrev = categoryReadOnly
    ? product.stockUnitAbbrev
    : selectedCategory?.stockUnitAbbrev ?? ""

  return (
    <FieldSection>
      {/* Left column */}
      <CellAt col={1} row={1} colSpan={4}>
        <FormField label="Category" required={!categoryReadOnly}>
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
        </FormField>
      </CellAt>
      <CellAt col={1} row={2} colSpan={4}>
        <FormField label="Style">
          {fieldsReadOnly ? (
            <StaticFieldValue>{draft.style || "—"}</StaticFieldValue>
          ) : (
            <TextCell
              editable={editable}
              value={draft.style}
              onChange={(value) => onFieldChange("style", value)}
            />
          )}
        </FormField>
      </CellAt>
      <CellAt col={1} row={3} colSpan={4}>
        <FormField label="Color">
          {fieldsReadOnly ? (
            <StaticFieldValue>{draft.color || "—"}</StaticFieldValue>
          ) : (
            <TextCell
              editable={editable}
              value={draft.color}
              onChange={(value) => onFieldChange("color", value)}
            />
          )}
        </FormField>
      </CellAt>
      <CellAt col={1} row={4} colSpan={4}>
        <FormField
          label="Naming Add-on"
          currentLength={editable ? draft.productNamingAddon.length : undefined}
          maxLength={editable ? PRODUCT_NAMING_ADDON_MAX : undefined}
        >
          {fieldsReadOnly ? (
            <StaticFieldValue>{draft.productNamingAddon || "—"}</StaticFieldValue>
          ) : (
            <TextCell
              editable={editable}
              value={draft.productNamingAddon}
              onChange={(value) => onFieldChange("productNamingAddon", value)}
              maxLength={PRODUCT_NAMING_ADDON_MAX}
            />
          )}
        </FormField>
      </CellAt>
      {/* Right column */}
      <CellAt col={5} row={1} colSpan={2}>
        <FormField label="Coverage / Unit">
          <PerUnitCell
            editable={!disabled}
            value={draft.coveragePerUnit}
            onChange={(value) => onFieldChange("coveragePerUnit", value)}
            unit={coverageUnitAbbrev}
            currencyPrefix=""
            ariaLabel="Coverage per unit"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={3} colSpan={2}>
        <FormField label="Stock Unit">
          <StaticFieldValue>{stockUnitDisplay}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={5} row={2} colSpan={2}>
        <FormField label="Manufacturer">
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
        </FormField>
      </CellAt>
      {/* Read-only canonical PROD-N number — detail view only (empty on create). */}
      {product.productNumber ? (
        <CellAt col={5} row={4} colSpan={2}>
          <FormField label="PROD #">
            <StaticFieldValue>{product.productNumber}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
      {product.createdAt ? (
        <>
          <CellAt col={1} row={5} colSpan={4}>
            <FormField label="Created">
              <StaticFieldValue>
                {formatEasternDateTime(product.createdAt) || "—"}
              </StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={5} row={5} colSpan={4}>
            <FormField label="Updated">
              <StaticFieldValue>
                {formatEasternDateTime(product.updatedAt) || "—"}
              </StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={1} row={6} colSpan={4}>
            <FormField label="Created by">
              <StaticFieldValue>{product.createdBy ?? "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
          <CellAt col={5} row={6} colSpan={4}>
            <FormField label="Updated by">
              <StaticFieldValue>{product.updatedBy ?? "—"}</StaticFieldValue>
            </FormField>
          </CellAt>
        </>
      ) : null}
    </FieldSection>
  )
}
