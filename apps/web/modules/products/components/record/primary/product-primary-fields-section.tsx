"use client"

import { useMemo, useState } from "react"
import {
  CellAt,
  FieldSection,
  FormField,
  PerUnitCell,
  RecordColumnBreak,
  RecordSectionDivider,
  StaticFieldValue,
  TextCell,
} from "@/engines/record-view"
import { CellChip, PaletteColorDropdown } from "@/engines/common"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import {
  formatEasternDateTime,
  type PaletteColor,
  type ProductCreateForm,
} from "@builders/domain"

const PRODUCT_NAMING_ADDON_MAX = 80

function formatUnit(name: string | null | undefined, abbrev: string | null | undefined) {
  if (!name) return "—"
  return abbrev ? `${name} (${abbrev})` : name
}

/**
 * Products primary section, on the canonical record-view invisible grid.
 * A centered `RecordColumnBreak` splits the spec fields into two flanks —
 * left = identity (PROD # + Palette paired / Category / Style / Color / Naming
 * Add-on), right = the unit / coverage cluster (Coverage·Unit / Manufacturer /
 * Stock Unit) — then a `RecordSectionDivider` terminates the section above a read-only
 * metadata band (Created / Updated / Created by / Updated by), mirroring
 * work-orders + inventory. The former Details / Units card groupings are gone.
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
  entityName,
  disabled,
  categoryReadOnly = false,
  fieldsReadOnly = false,
  onFieldChange,
}: {
  product: ProductRecord
  draft: ProductCreateForm
  categoryOptions: CategoryRecord[]
  /**
   * Pre-resolved label for the saved `entityId`, sourced from
   * `product.entityName` (joined entity.entity). Empty string on create
   * mode — the picker still works, just renders no trigger label until
   * the user picks one.
   */
  entityName: string | null
  disabled: boolean
  categoryReadOnly?: boolean
  fieldsReadOnly?: boolean
  onFieldChange: (field: keyof ProductCreateForm, value: string | PaletteColor) => void
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

  // The picker derives its trigger label only from `selectedLabel`; on select it
  // updates `entityId` but not the saved join name. Hold the in-flight pick label
  // locally and reset it (during render) whenever the saved `entityName` changes —
  // a save commits the pick (new name == pickedLabel, no flicker) or a record swap
  // (stepper) loads a neighbour (falls back to that record's entityName).
  const [pickedLabel, setPickedLabel] = useState<string | null>(null)
  const [seenEntityName, setSeenEntityName] = useState(entityName)
  if (seenEntityName !== entityName) {
    setSeenEntityName(entityName)
    setPickedLabel(null)
  }

  const stockUnitDisplay = categoryReadOnly
    ? formatUnit(product.stockUnitName, product.stockUnitAbbrev)
    : formatUnit(selectedCategory?.stockUnit, selectedCategory?.stockUnitAbbrev)
  const coverageUnitAbbrev = categoryReadOnly
    ? product.stockUnitAbbrev
    : selectedCategory?.stockUnitAbbrev ?? ""

  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        left={
          <FieldSection>
            {/* Left flank, top down: PROD # + Palette paired (one row, = the
                Category width below) / Category / Style / Color / Naming Add-on.
                The full-width cells auto-flow, so the detail-only top pair leaves
                no gap on the create flow. */}
            {/* Read-only canonical PROD-N number — detail view only (empty on create). */}
            {product.productNumber ? (
              <CellAt col={1} colSpan={4}>
                <FormField label="PROD #">
                  {/* Palette tag recolors the PROD-# cell live off the draft —
                      mirrors the list cell + work-orders' record-view number cell. */}
                  <CellChip paletteColor={draft.paletteColor}>
                    {product.productNumber}
                  </CellChip>
                </FormField>
              </CellAt>
            ) : null}
            {/* Non-semantic palette tag — edit-only. Labelled "Palette" to stay
                distinct from the physical "Color" field below. The create flow
                (categoryReadOnly false) renders no picker. */}
            {categoryReadOnly ? (
              <CellAt col={5} colSpan={4}>
                <FormField label="Palette">
                  <PaletteColorDropdown
                    value={draft.paletteColor}
                    editable={editable}
                    onChange={(next) => onFieldChange("paletteColor", next)}
                    ariaLabel="Product palette color"
                  />
                </FormField>
              </CellAt>
            ) : null}
            <CellAt col={1} colSpan={8}>
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
            <CellAt col={1} colSpan={8}>
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
            <CellAt col={1} colSpan={8}>
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
            <CellAt col={1} colSpan={8}>
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
          </FieldSection>
        }
        right={
          <FieldSection>
            {/* Right flank: coverage / unit cluster */}
            <CellAt col={1} row={1} colSpan={4}>
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
            <CellAt col={1} row={2} colSpan={4}>
              <FormField label="Entity">
                {fieldsReadOnly ? (
                  <StaticFieldValue>{entityName || "—"}</StaticFieldValue>
                ) : (
                  <EntityTypePicker
                    value={draft.entityId || null}
                    onChange={(id) => onFieldChange("entityId", id ?? "")}
                    onOptionSelected={(opt) => setPickedLabel(opt?.entity ?? null)}
                    selectedLabel={draft.entityId ? pickedLabel ?? entityName : null}
                    disabled={disabled}
                    placeholder="Select entity"
                    ariaLabel="Entity"
                  />
                )}
              </FormField>
            </CellAt>
            <CellAt col={1} row={3} colSpan={4}>
              <FormField label="Stock Unit">
                <StaticFieldValue>{stockUnitDisplay}</StaticFieldValue>
              </FormField>
            </CellAt>
          </FieldSection>
        }
      />
      {product.createdAt ? (
        <>
          <RecordSectionDivider />
          {/* Read-only metadata band: Created / Updated over Created by / Updated by */}
          <FieldSection>
            <CellAt col={1} row={1} colSpan={4}>
              <FormField label="Created">
                <StaticFieldValue>
                  {formatEasternDateTime(product.createdAt) || "—"}
                </StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={5} row={1} colSpan={4}>
              <FormField label="Updated">
                <StaticFieldValue>
                  {formatEasternDateTime(product.updatedAt) || "—"}
                </StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={1} row={2} colSpan={4}>
              <FormField label="Created by">
                <StaticFieldValue>{product.createdBy ?? "—"}</StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={5} row={2} colSpan={4}>
              <FormField label="Updated by">
                <StaticFieldValue>{product.updatedBy ?? "—"}</StaticFieldValue>
              </FormField>
            </CellAt>
          </FieldSection>
        </>
      ) : null}
    </div>
  )
}
