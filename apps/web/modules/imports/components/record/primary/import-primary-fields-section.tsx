"use client"

import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
import { TextCell, TextareaCell } from "@/components/cells"
import { ManufacturerPicker } from "@/modules/manufacturers/components/picker/manufacturer-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  formatEasternDateTime,
  IMPORT_INTERNAL_NOTES_MAX,
  IMPORT_PURCHASE_ORDER_NUMBER_MAX,
  type ImportPrimaryForm,
} from "@builders/domain"
import { ImportGroup } from "./import-group"

export function ImportPrimaryFieldsSection({
  draft,
  warehouseName,
  manufacturerName,
  createdAt,
  updatedAt,
  disabled,
  onFieldChange,
}: {
  draft: ImportPrimaryForm
  warehouseName: string | null
  manufacturerName: string | null
  // Present on the record view (existing import); omitted on the create flow,
  // where there's no persisted row yet — the timestamp cells stay hidden.
  createdAt?: string
  updatedAt?: string
  disabled: boolean
  onFieldChange: (field: keyof ImportPrimaryForm, value: string) => void
}) {
  const editable = !disabled

  return (
    <div className="flex flex-col gap-4">
      <ImportGroup title="Details">
        <FieldSection>
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
          <CellAt col={3} colSpan={2}>
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
          <CellAt col={5} colSpan={2}>
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
          {createdAt ? (
            <CellAt col={1} colSpan={2}>
              <FormField label="Created">
                <StaticFieldValue>{formatEasternDateTime(createdAt) || "—"}</StaticFieldValue>
              </FormField>
            </CellAt>
          ) : null}
          {updatedAt ? (
            <CellAt col={3} colSpan={2}>
              <FormField label="Updated">
                <StaticFieldValue>{formatEasternDateTime(updatedAt) || "—"}</StaticFieldValue>
              </FormField>
            </CellAt>
          ) : null}
        </FieldSection>
      </ImportGroup>

      <ImportGroup title="Notes">
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
      </ImportGroup>
    </div>
  )
}
