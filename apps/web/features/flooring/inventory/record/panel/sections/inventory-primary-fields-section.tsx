"use client"

import {
  RECORD_CURRENCY_PREFIX,
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RECORD_PREFIX_CONTROL_CLASS_NAME,
  RECORD_PREFIXED_CONTROL_CONTAINER_CLASS_NAME,
  RECORD_PREFIXED_CONTROL_INPUT_CLASS_NAME,
  RECORD_TEXTAREA_CONTROL_CLASS_NAME,
  RecordFormField,
} from "@/features/shared/engines/record-view"
import { formatInventoryImportNumber } from "../../../domain/formatters"
import type { InventoryPrimaryForm, InventoryRow, LocationOption } from "../../../domain/types"

const READONLY_FIELD_CLASS_NAME = `${RECORD_FIELD_CONTROL_CLASS_NAME} cursor-default`

export function InventoryPrimaryFieldsSection({
  inventory,
  draft,
  locationOptions,
  warehouseName,
  disabled,
  onFieldChange,
}: {
  inventory: InventoryRow
  draft: InventoryPrimaryForm
  locationOptions: LocationOption[]
  warehouseName: string
  disabled: boolean
  onFieldChange: (field: keyof InventoryPrimaryForm, value: string) => void
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <RecordFormField label="Product">
        <input value={inventory.productName} readOnly className={READONLY_FIELD_CLASS_NAME} />
      </RecordFormField>
      <RecordFormField label="Warehouse">
        <input value={warehouseName || "-"} readOnly className={READONLY_FIELD_CLASS_NAME} />
      </RecordFormField>
      <RecordFormField label="Import #">
        <input value={formatInventoryImportNumber(inventory.importNumber)} readOnly className={READONLY_FIELD_CLASS_NAME} />
      </RecordFormField>
      <RecordFormField label="Location">
        <select
          value={draft.locationId}
          onChange={(event) => onFieldChange("locationId", event.target.value)}
          className={RECORD_FIELD_CONTROL_CLASS_NAME}
          disabled={disabled}
        >
          <option value="">Select Location</option>
          {locationOptions.map((location) => (
            <option key={location.id} value={location.id}>
              {location.locationCode}
            </option>
          ))}
        </select>
      </RecordFormField>
      <RecordFormField label="Item #">
        <input
          value={draft.itemNumber}
          onChange={(event) => onFieldChange("itemNumber", event.target.value)}
          className={RECORD_FIELD_CONTROL_CLASS_NAME}
          disabled={disabled}
        />
      </RecordFormField>
      <RecordFormField label="Lot">
        <input
          value={draft.dyeLot}
          onChange={(event) => onFieldChange("dyeLot", event.target.value)}
          className={RECORD_FIELD_CONTROL_CLASS_NAME}
          disabled={disabled}
        />
      </RecordFormField>
      <RecordFormField label="Cost">
        <div className={RECORD_PREFIXED_CONTROL_CONTAINER_CLASS_NAME}>
          <span aria-hidden="true" className={RECORD_PREFIX_CONTROL_CLASS_NAME}>
            {RECORD_CURRENCY_PREFIX}
          </span>
          <input
            aria-label="Cost"
            value={draft.cost}
            onChange={(event) => onFieldChange("cost", event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className={RECORD_PREFIXED_CONTROL_INPUT_CLASS_NAME}
            disabled={disabled}
          />
        </div>
      </RecordFormField>
      <RecordFormField label="Freight">
        <div className={RECORD_PREFIXED_CONTROL_CONTAINER_CLASS_NAME}>
          <span aria-hidden="true" className={RECORD_PREFIX_CONTROL_CLASS_NAME}>
            {RECORD_CURRENCY_PREFIX}
          </span>
          <input
            aria-label="Freight"
            value={draft.freight}
            onChange={(event) => onFieldChange("freight", event.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className={RECORD_PREFIXED_CONTROL_INPUT_CLASS_NAME}
            disabled={disabled}
          />
        </div>
      </RecordFormField>
      <div className="md:col-span-2 xl:col-span-3">
        <RecordFormField label="Notes">
          <textarea
            value={draft.notes}
            onChange={(event) => onFieldChange("notes", event.target.value)}
            rows={2}
            className={RECORD_TEXTAREA_CONTROL_CLASS_NAME}
            disabled={disabled}
          />
        </RecordFormField>
      </div>
    </div>
  )
}
