"use client"

import { CellAt } from "@/engines/record-view"
import { FieldSection, FormField, StaticFieldValue } from "@/engines/record-view"
import { TextCell, TextareaCell } from "@/engines/record-view"
import { ManufacturerPicker } from "@/modules/manufacturers/components/picker/manufacturer-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  formatEasternDateTime,
  IMPORT_INTERNAL_NOTES_MAX,
  IMPORT_PURCHASE_ORDER_NUMBER_MAX,
  type ImportPrimaryForm,
} from "@builders/domain"

/**
 * Composer for the imports primary section. Renders every field on the
 * record-view engine's invisible grid (`FieldSection` + `CellAt` + `FormField`),
 * mirroring the templates migration — the former "Details" / "Notes" tab-card
 * groups (`ImportGroup`) are gone. Layout (all cells 2 cols wide): Warehouse /
 * Created on row 1, Manufacturer / Updated on row 2, Purchase Order Number on
 * row 3, Internal Notes on row 4. Each timestamp cell is sourced right after its
 * left-column partner so column-only auto-flow seats them on the same row; the
 * create flow (no Created / Updated cells) collapses to a single left column
 * without a gap.
 */
export function ImportPrimaryFieldsSection({
  draft,
  warehouseName,
  manufacturerName,
  createdAt,
  updatedAt,
  createdBy,
  updatedBy,
  disabled,
  onFieldChange,
}: {
  draft: ImportPrimaryForm
  warehouseName: string | null
  manufacturerName: string | null
  // Present on the record view (existing import); omitted on the create flow,
  // where there's no persisted row yet — the timestamp + actor cells stay hidden.
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
  disabled: boolean
  onFieldChange: (field: keyof ImportPrimaryForm, value: string) => void
}) {
  const editable = !disabled

  return (
    <FieldSection gap="0.75rem">
      <CellAt col={1} colSpan={2}>
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
      {createdAt ? (
        <CellAt col={3} colSpan={2}>
          <FormField label="Created">
            <StaticFieldValue>{formatEasternDateTime(createdAt) || "—"}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
      <CellAt col={1} colSpan={2}>
        <FormField label="Manufacturer">
          {editable ? (
            <ManufacturerPicker
              value={draft.manufacturerId || null}
              onChange={(id) => onFieldChange("manufacturerId", id ?? "")}
              selectedLabel={manufacturerName || null}
              placeholder="Select Manufacturer"
              ariaLabel="Manufacturer"
            />
          ) : (
            <StaticFieldValue>{manufacturerName || "—"}</StaticFieldValue>
          )}
        </FormField>
      </CellAt>
      {updatedAt ? (
        <CellAt col={3} colSpan={2}>
          <FormField label="Updated">
            <StaticFieldValue>{formatEasternDateTime(updatedAt) || "—"}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
      <CellAt col={1} colSpan={2}>
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
      {createdBy !== undefined ? (
        <CellAt col={3} colSpan={2}>
          <FormField label="Created by">
            <StaticFieldValue>{createdBy || "—"}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
      <CellAt col={1} colSpan={2}>
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
      {updatedBy !== undefined ? (
        <CellAt col={3} colSpan={2}>
          <FormField label="Updated by">
            <StaticFieldValue>{updatedBy || "—"}</StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}
    </FieldSection>
  )
}
