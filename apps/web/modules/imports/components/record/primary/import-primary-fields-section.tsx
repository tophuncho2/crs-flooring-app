"use client"

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
import { ManufacturerPicker } from "@/modules/manufacturers/components/picker/manufacturer-picker"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  formatEasternDateTime,
  IMPORT_INTERNAL_NOTES_MAX,
  IMPORT_PURCHASE_ORDER_NUMBER_MAX,
  type ImportPrimaryForm,
} from "@builders/domain"

/**
 * Composer for the imports primary section, on the canonical record-view grid.
 * A centered `RecordColumnBreak` splits the editable fields into two flanks —
 * left = Warehouse / Purchase Order Number / Internal Notes, right = Manufacturer —
 * then a `RecordSectionDivider` terminates the section above a read-only metadata
 * band (Created / Updated over Created by / Updated by), mirroring products +
 * inventory + work-orders. The create flow (no persisted row) renders neither the
 * divider nor the band.
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
    <div className="flex flex-col gap-4">
      <RecordColumnBreak
        left={
          <FieldSection gap="0.75rem">
            {/* Left flank: Warehouse / Purchase Order Number / Internal Notes */}
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
          <FieldSection gap="0.75rem">
            {/* Right flank: Manufacturer */}
            <CellAt col={1} colSpan={8}>
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
          </FieldSection>
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
