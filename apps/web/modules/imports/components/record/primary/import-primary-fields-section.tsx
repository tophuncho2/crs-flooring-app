"use client"

import { useState } from "react"
import { CellChip, PaletteColorDropdown } from "@/engines/common"
import {
  CellAt,
  FieldSection,
  FormField,
  RecordColumnBreak,
  RecordSectionDivider,
  StaticFieldValue,
  TextCell,
  TextareaCell,
} from "@/engines/record-view"
import { EntityTypePicker } from "@/modules/entities/components/picker/entity-type-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  formatEasternDateTime,
  IMPORT_INTERNAL_NOTES_MAX,
  IMPORT_PURCHASE_ORDER_NUMBER_MAX,
  type ImportPrimaryForm,
  type PaletteColor,
} from "@builders/domain"

/**
 * Composer for the imports primary section, on the canonical record-view grid.
 * A centered `RecordColumnBreak` splits the editable fields into two flanks —
 * left = Import # chip + Color (one row, half-width each = the Warehouse width
 * below) / Warehouse / Manufacturer / Purchase Order Number / Internal Notes,
 * right = empty (the break is retained) — then a `RecordSectionDivider`
 * terminates the section
 * above a read-only metadata band (Created / Updated over Created by / Updated by),
 * mirroring products + inventory + work-orders. The create flow (no persisted row)
 * renders neither the colored Import # identity cell, the editable Color tag, the
 * divider, nor the band — color is edit-only (`column-color`).
 */
export function ImportPrimaryFieldsSection({
  draft,
  importNumber,
  warehouseName,
  entityName,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  disabled,
  onFieldChange,
}: {
  draft: ImportPrimaryForm
  // Present on the record view (existing import); omitted on the create flow.
  // Drives the colored `IMP-#` identity chip + the editable Color tag, both of
  // which are record/edit-only.
  importNumber?: number
  warehouseName: string | null
  entityName: string | null
  // Present on the record view (existing import); omitted on the create flow,
  // where there's no persisted row yet — the timestamp + actor cells stay hidden.
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
  disabled: boolean
  // `value` widens to PaletteColor for the Color tag; all other fields are strings.
  onFieldChange: (field: keyof ImportPrimaryForm, value: string | PaletteColor) => void
}) {
  const editable = !disabled
  const persisted = importNumber !== undefined

  // The picker derives its trigger label only from `selectedLabel`; on select it
  // updates `entityId` but not the saved join name. Hold the in-flight pick label
  // locally and reset it (during render) whenever the saved `entityName` changes —
  // a save commits the pick (new name == pickedLabel, no flicker) or a record swap
  // loads a neighbour (falls back to that record's entityName).
  const [pickedLabel, setPickedLabel] = useState<string | null>(null)
  const [seenEntityName, setSeenEntityName] = useState(entityName)
  if (seenEntityName !== entityName) {
    setSeenEntityName(entityName)
    setPickedLabel(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        left={
          <FieldSection gap="0.75rem">
            {/* Left flank: Import # chip + Color (one row, = Warehouse width) /
                Warehouse / Purchase Order Number / Internal Notes.
                The chip + color tag are record/edit-only (no persisted row on create). */}
            {persisted ? (
              <>
                <CellAt col={1} colSpan={4}>
                  <FormField label="Import #">
                    <CellChip paletteColor={draft.color}>{`IMP-${importNumber}`}</CellChip>
                  </FormField>
                </CellAt>
                <CellAt col={5} colSpan={4}>
                  <FormField label="Color">
                    <PaletteColorDropdown
                      value={draft.color}
                      editable={editable}
                      onChange={(color) => onFieldChange("color", color)}
                      ariaLabel="Import color"
                    />
                  </FormField>
                </CellAt>
              </>
            ) : null}
            <CellAt col={1} colSpan={8}>
              <FormField label="Warehouse" required>
                {editable ? (
                  <WarehousePicker
                    value={draft.warehouseId || null}
                    onChange={(id) => onFieldChange("warehouseId", id ?? "")}
                    selectedLabel={warehouseName || null}
                    placeholder="Select Warehouse"
                    ariaLabel="Warehouse"
                  />
                ) : (
                  <StaticFieldValue>{warehouseName || "—"}</StaticFieldValue>
                )}
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField label="Entity">
                {editable ? (
                  <EntityTypePicker
                    value={draft.entityId || null}
                    onChange={(id) => onFieldChange("entityId", id ?? "")}
                    onOptionSelected={(opt) => setPickedLabel(opt?.entity ?? null)}
                    selectedLabel={draft.entityId ? pickedLabel ?? entityName : null}
                    placeholder="Select entity"
                    ariaLabel="Entity"
                  />
                ) : (
                  <StaticFieldValue>{entityName || "—"}</StaticFieldValue>
                )}
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField
                label="Purchase Order Number"
                currentLength={editable ? draft.purchaseOrderNumber.length : undefined}
                maxLength={IMPORT_PURCHASE_ORDER_NUMBER_MAX}
              >
                <TextCell
                  editable={editable}
                  value={draft.purchaseOrderNumber}
                  onChange={(value) => onFieldChange("purchaseOrderNumber", value)}
                  maxLength={IMPORT_PURCHASE_ORDER_NUMBER_MAX}
                />
              </FormField>
            </CellAt>
            <CellAt col={1} colSpan={8}>
              <FormField
                label="Internal Notes"
                currentLength={editable ? draft.internalNotes.length : undefined}
                maxLength={IMPORT_INTERNAL_NOTES_MAX}
              >
                <TextareaCell
                  editable={editable}
                  value={draft.internalNotes}
                  onChange={(value) => onFieldChange("internalNotes", value)}
                  maxLength={IMPORT_INTERNAL_NOTES_MAX}
                  rows={3}
                />
              </FormField>
            </CellAt>
          </FieldSection>
        }
        right={
          /* Right flank intentionally empty; the column break is retained. */
          <FieldSection gap="0.75rem">{null}</FieldSection>
        }
      />
      {createdAt ? (
        <>
          <RecordSectionDivider />
          {/* Read-only metadata band: Created / Updated over Created by / Updated by */}
          <FieldSection gap="0.75rem">
            <CellAt col={1} row={1} colSpan={4}>
              <FormField label="Created">
                <StaticFieldValue>{formatEasternDateTime(createdAt) || "—"}</StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={5} row={1} colSpan={4}>
              <FormField label="Updated">
                <StaticFieldValue>
                  {updatedAt ? formatEasternDateTime(updatedAt) || "—" : "—"}
                </StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={1} row={2} colSpan={4}>
              <FormField label="Created by">
                <StaticFieldValue>{createdBy || "—"}</StaticFieldValue>
              </FormField>
            </CellAt>
            <CellAt col={5} row={2} colSpan={4}>
              <FormField label="Updated by">
                <StaticFieldValue>{updatedBy || "—"}</StaticFieldValue>
              </FormField>
            </CellAt>
          </FieldSection>
        </>
      ) : null}
    </div>
  )
}
