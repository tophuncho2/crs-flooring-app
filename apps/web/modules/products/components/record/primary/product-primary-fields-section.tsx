"use client"

import { useMemo, useState } from "react"
import {
  CellAt,
  FieldSection,
  FormField,
  NumberCell,
  RecordColumnBreak,
  RecordSectionDivider,
  StatCell,
  StaticFieldValue,
  TextCell,
} from "@/engines/record-view"
import { CellChip, PaletteColorDropdown } from "@/engines/common"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { UnitOfMeasurePicker } from "@/modules/unit-of-measures/components/picker/unit-of-measure-picker"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import type { CategoryRecord, ProductRecord } from "@builders/db"
import {
  formatEasternDateTime,
  type PaletteColor,
  type ProductCreateForm,
  type ProductStats,
} from "@builders/domain"

const PRODUCT_NAMING_ADDON_MAX = 80

/**
 * Products primary section, on the canonical record-view invisible grid.
 * In the detail view a `RecordColumnBreak` splits the section into two flanks —
 * left = all spec fields (PROD # + Palette paired / Category + Stock Unit paired /
 * Coverage·Unit + Coverage Unit paired / Style / Color / Naming Add-on / Entity),
 * right = the read-only
 * linked-row counts stacked vertically — then a `RecordSectionDivider` terminates
 * the section above a read-only metadata band (Created / Updated / Created by /
 * Updated by), mirroring warehouse + job-types. The create flow renders the same
 * spec fields as a single column (no stats, no metadata band yet).
 *
 * `categoryReadOnly` is the detail-vs-create discriminator (the record panel sets
 * it; the create flow leaves it false) — it drives the detail-only layout (PROD #,
 * Palette, stats, metadata band), NOT Category editability (category is mutable now,
 * UoM epic 2A). `fieldsReadOnly` renders the identity/spec cells (category, unit,
 * style, color, naming addon) as static values.
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
  // Category is editable in both flows now (UoM epic 2A) — the label always
  // resolves off the draft against the flat `categoryOptions` pass-through list.
  const selectedCategory = useMemo(
    () => categoryOptions.find((category) => category.id === draft.categoryId) ?? null,
    [categoryOptions, draft.categoryId],
  )

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

  // The UoM picker is async/paginated — same label-binding contract as entity.
  // Hold the in-flight pick name and reset it when the saved unit changes (save
  // commits the pick; a record swap loads the neighbour's unit).
  const savedUnitName = product.unit?.name ?? null
  const [pickedUnitLabel, setPickedUnitLabel] = useState<string | null>(null)
  const [seenUnitName, setSeenUnitName] = useState(savedUnitName)
  if (seenUnitName !== savedUnitName) {
    setSeenUnitName(savedUnitName)
    setPickedUnitLabel(null)
  }

  // Coverage unit picker (UoM epic 1a) — its OWN FK, independent of the main
  // unit. Same async label-binding contract as above: hold the in-flight pick
  // label and reset it when the saved coverage unit changes (save / record swap).
  const savedCoverageUnitName = product.coverageUnit?.name ?? null
  const [pickedCoverageUnitLabel, setPickedCoverageUnitLabel] = useState<string | null>(null)
  const [seenCoverageUnitName, setSeenCoverageUnitName] = useState(savedCoverageUnitName)
  if (seenCoverageUnitName !== savedCoverageUnitName) {
    setSeenCoverageUnitName(savedCoverageUnitName)
    setPickedCoverageUnitLabel(null)
  }

  // All spec fields, shared by both flows. Detail puts these in the left flank;
  // create renders them as a single column. Top down: PROD # + Palette paired
  // (detail-only) / Category + Stock Unit paired (equal width) / Coverage·Unit +
  // Coverage Unit paired / Style / Color / Naming Add-on / Entity. Entity takes
  // col 1 with no explicit row, so it stacks vertically below Naming Add-on.
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
      {/* Category + Unit sit side by side, equal width (4 + 4). Both editable
          pickers now (UoM epic 2A) — category is mutable, unit is its own FK. */}
      <CellAt col={1} colSpan={4}>
        <FormField label="Category" required>
          {fieldsReadOnly ? (
            <StaticFieldValue>{selectedCategory?.name || product.category.name || "—"}</StaticFieldValue>
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
        <FormField label="Unit" required>
          {fieldsReadOnly ? (
            <StaticFieldValue>{savedUnitName || "—"}</StaticFieldValue>
          ) : (
            <UnitOfMeasurePicker
              value={draft.unitId || null}
              onChange={(nextUnitId) => onFieldChange("unitId", nextUnitId ?? "")}
              onOptionSelected={(opt) => setPickedUnitLabel(opt?.name ?? null)}
              selectedLabel={draft.unitId ? pickedUnitLabel ?? savedUnitName : null}
              disabled={disabled}
              placeholder="Select a unit"
              ariaLabel="Unit"
            />
          )}
        </FormField>
      </CellAt>
      {/* Coverage·Unit + its coverage-unit picker paired (4 + 4), sitting
          directly under Category + Unit. The picker sets the product's OWN
          coverage unit (UoM epic 1a); no unit suffix on the value cell — the
          Coverage Unit picker beside it already shows the unit. */}
      <CellAt col={1} colSpan={4}>
        <FormField label="Coverage / Unit">
          <NumberCell
            editable={!disabled}
            value={draft.coveragePerUnit}
            onChange={(value) => onFieldChange("coveragePerUnit", value)}
            ariaLabel="Coverage per unit"
          />
        </FormField>
      </CellAt>
      <CellAt col={5} colSpan={4}>
        <FormField label="Coverage Unit">
          {fieldsReadOnly ? (
            <StaticFieldValue>{savedCoverageUnitName || "—"}</StaticFieldValue>
          ) : (
            <UnitOfMeasurePicker
              value={draft.coverageUnitId || null}
              onChange={(nextUnitId) => onFieldChange("coverageUnitId", nextUnitId ?? "")}
              onOptionSelected={(opt) => setPickedCoverageUnitLabel(opt?.name ?? null)}
              selectedLabel={
                draft.coverageUnitId ? pickedCoverageUnitLabel ?? savedCoverageUnitName : null
              }
              disabled={disabled}
              placeholder="Select a unit"
              ariaLabel="Coverage unit"
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
      <CellAt col={1} colSpan={8}>
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

  // Create flow: no stats / no metadata / no column rule / no divider. The spec
  // fields sit at the SAME width as the detail view's left flank — the 7fr side
  // of the right-narrow split — instead of stretching the full panel width. We
  // reuse the engine's right-narrow grid template but leave the rule + 3fr flank
  // empty (nothing rendered where the stats sit in the detail view).
  if (!categoryReadOnly) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,7fr)_auto_minmax(0,3fr)] md:gap-x-8">
        <div className="min-w-0">
          <FieldSection>{specFields}</FieldSection>
        </div>
      </div>
    )
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
              <FormField label="Planned Products">
                <StatCell
                  value={stats?.plannedProductsCount ?? 0}
                  ariaLabel="Linked planned products total"
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
