"use client"

import { useMemo, useState } from "react"
import {
  CellAt,
  FieldSection,
  FormField,
  PerUnitCell,
  RecordColumnBreak,
  RecordSectionDivider,
  StatCell,
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
  type ProductStats,
} from "@builders/domain"

const PRODUCT_NAMING_ADDON_MAX = 80

function formatUnit(name: string | null | undefined, abbrev: string | null | undefined) {
  if (!name) return "—"
  return abbrev ? `${name} (${abbrev})` : name
}

/**
 * Products primary section, on the canonical record-view invisible grid.
 * In the detail view a `RecordColumnBreak` splits the section into two flanks —
 * left = all spec fields (PROD # + Palette paired / Category + Stock Unit paired /
 * Style / Color / Naming Add-on / Coverage·Unit / Entity), right = the read-only
 * linked-row counts stacked vertically — then a `RecordSectionDivider` terminates
 * the section above a read-only metadata band (Created / Updated / Created by /
 * Updated by), mirroring warehouse + job-types. The create flow renders the same
 * spec fields as a single column (no stats, no metadata band yet).
 *
 * `categoryReadOnly` renders Category as a static value (immutable
 * post-create; enforced at the type/validator/domain layers) and doubles as the
 * detail-vs-create discriminator (the record panel sets it; the create flow leaves
 * it false). `fieldsReadOnly` renders the remaining identity/spec cells
 * (style, color, naming addon) read-only too.
 */
export function ProductPrimaryFieldsSection({
  product,
  draft,
  categoryOptions,
  entityName,
  disabled,
  categoryReadOnly = false,
  fieldsReadOnly = false,
  stats,
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
  /** Linked-row counts shown in the detail view's right flank; omit in the create flow. */
  stats?: ProductStats
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

  // All spec fields, shared by both flows. Detail puts these in the left flank;
  // create renders them as a single column. Top down: PROD # + Palette paired
  // (detail-only) / Category + Stock Unit paired (equal width) / Style / Color /
  // Naming Add-on / Coverage·Unit / Entity. Coverage·Unit and Entity each take
  // col 1 with no explicit row, so they stack vertically below Naming Add-on.
  const specFields = (
    <>
      {/* Read-only canonical PROD-N number — detail view only (empty on create). */}
      {product.productNumber ? (
        <CellAt col={1} colSpan={4}>
          <FormField label="PROD #">
            {/* Palette tag recolors the PROD-# cell live off the draft —
                mirrors the list cell + work-orders' record-view number cell. */}
            <CellChip paletteColor={draft.paletteColor}>{product.productNumber}</CellChip>
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
      {/* Category + Stock Unit sit side by side, equal width (4 + 4). */}
      <CellAt col={1} colSpan={4}>
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
      <CellAt col={5} colSpan={4}>
        <FormField label="Stock Unit">
          <StaticFieldValue>{stockUnitDisplay}</StaticFieldValue>
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
      {/* Coverage·Unit then Entity, stacked below Naming Add-on. */}
      <CellAt col={1} colSpan={4}>
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
      <CellAt col={1} colSpan={4}>
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
    </>
  )

  // Create flow: no stats / no metadata — keep the spec fields as a single column.
  if (!categoryReadOnly) {
    return <FieldSection>{specFields}</FieldSection>
  }

  // Detail flow: spec fields left, linked-row counts stacked right, then a
  // divider over the read-only snapshot + actor metadata band.
  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        split="right-narrow"
        left={<FieldSection>{specFields}</FieldSection>}
        right={
          <FieldSection>
            <CellAt col={1} colSpan={8}>
              <FormField label="Template Items">
                <StatCell
                  value={stats?.templateItemsCount ?? 0}
                  ariaLabel="Linked template items total"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Work Order Items">
                <StatCell
                  value={stats?.workOrderItemsCount ?? 0}
                  ariaLabel="Linked work order items total"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Inventory">
                <StatCell
                  value={stats?.inventoryCount ?? 0}
                  ariaLabel="Linked inventory total"
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Adjustments">
                <StatCell
                  value={stats?.adjustmentsCount ?? 0}
                  ariaLabel="Linked adjustments total"
                />
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
