"use client"

import {
  RECORD_CURRENCY_PREFIX,
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RECORD_PREFIX_CONTROL_CLASS_NAME,
  RECORD_PREFIXED_CONTROL_CONTAINER_CLASS_NAME,
  RECORD_PREFIXED_CONTROL_INPUT_CLASS_NAME,
  RECORD_TEXTAREA_CONTROL_CLASS_NAME,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
  RecordStaticFieldValue,
} from "@/modules/shared/engines/record-view"
import {
  formatInventoryImportNumber,
  formatInventoryQuantity,
} from "../../../domain/formatters"
import type { InventoryPrimaryForm, InventoryRow, LocationOption } from "../../../domain/types"

const READONLY_FIELD_CLASS_NAME = `${RECORD_FIELD_CONTROL_CLASS_NAME} cursor-default`

export function InventoryPrimaryFieldsSection({
  inventory,
  draft,
  locationOptions,
  warehouseName,
  sectionName,
  disabled,
  onFieldChange,
}: {
  inventory: InventoryRow
  draft: InventoryPrimaryForm
  locationOptions: LocationOption[]
  warehouseName: string
  sectionName: string
  disabled: boolean
  onFieldChange: (field: keyof InventoryPrimaryForm, value: string) => void
}) {
  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="side" placement="left">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordPrimaryFieldCell>
            <RecordFormField label="Warehouse">
              <RecordStaticFieldValue>
                {warehouseName || "-"}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Section">
              <RecordStaticFieldValue>
                {sectionName || "-"}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Starting Stock">
              <RecordStaticFieldValue>
                {formatInventoryQuantity(inventory.stockCount, inventory.stockUnit)}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Cut Total">
              <RecordStaticFieldValue>
                {formatInventoryQuantity(inventory.cutTotal, inventory.stockUnit)}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Running Balance">
              <RecordStaticFieldValue>
                {formatInventoryQuantity(inventory.runningBalance, inventory.stockUnit)}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>

      <RecordPrimaryPane variant="main" placement="right">
        <RecordPrimaryFieldsGrid>
          <RecordPrimaryFieldCell size="md">
            <RecordFormField label="Product">
              <input value={inventory.productName} readOnly className={READONLY_FIELD_CLASS_NAME} />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Import #">
              <input value={formatInventoryImportNumber(inventory.importNumber)} readOnly className={READONLY_FIELD_CLASS_NAME} />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
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
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Item #">
              <input
                value={draft.itemNumber}
                onChange={(event) => onFieldChange("itemNumber", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Lot">
              <input
                value={draft.dyeLot}
                onChange={(event) => onFieldChange("dyeLot", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
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
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
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
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="lg">
            <RecordFormField label="Notes">
              <textarea
                value={draft.notes}
                onChange={(event) => onFieldChange("notes", event.target.value)}
                rows={2}
                className={RECORD_TEXTAREA_CONTROL_CLASS_NAME}
                disabled={disabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
