"use client"

import {
  RECORD_CURRENCY_PREFIX,
  RECORD_FIELD_CONTROL_CLASS_NAME,
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
  type InventoryForm,
  type InventoryLocationOption,
  type InventoryRow,
  type InventoryWarehouseOption,
} from "@builders/domain"

const READONLY_FIELD_CLASS_NAME = `${RECORD_FIELD_CONTROL_CLASS_NAME} cursor-default`

export function InventoryPrimaryFieldsSection({
  inventory,
  draft,
  locationOptions,
  warehouseOptions,
  selectedLocation,
  disabled,
  onFieldChange,
}: {
  inventory: InventoryRow
  draft: InventoryForm
  locationOptions: InventoryLocationOption[]
  warehouseOptions: InventoryWarehouseOption[]
  selectedLocation: InventoryLocationOption | null
  disabled: boolean
  onFieldChange: (field: keyof InventoryForm, value: string) => void
}) {
  return (
    <RecordPrimarySection>
      <RecordPrimaryPane variant="side" placement="left">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordPrimaryFieldCell>
            <RecordFormField label="Warehouse">
              <select
                aria-label="Warehouse"
                value={draft.warehouseId}
                onChange={(event) => onFieldChange("warehouseId", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled}
                required
              >
                <option value="">Select Warehouse</option>
                {warehouseOptions.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Full Location">
              <RecordStaticFieldValue>
                {selectedLocation?.locationCode || "-"}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Starting Balance">
              <RecordStaticFieldValue>
                {formatInventoryQuantity(inventory.startingStock, inventory.stockUnitAbbrev)}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Cut Balance">
              <RecordStaticFieldValue>
                {formatInventoryQuantity(inventory.totalCutSum, inventory.stockUnitAbbrev)}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Available">
              <RecordStaticFieldValue>
                {formatInventoryQuantity(inventory.stockBalance, inventory.stockUnitAbbrev)}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          {inventory.coverageBalance ? (
            <RecordPrimaryFieldCell>
              <RecordFormField label="Coverage">
                <RecordStaticFieldValue>
                  {formatInventoryQuantity(inventory.coverageBalance, inventory.itemCoverageUnitAbbrev)}
                </RecordStaticFieldValue>
              </RecordFormField>
            </RecordPrimaryFieldCell>
          ) : null}
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
              <input
                value={formatInventoryImportNumber(inventory.importNumber)}
                readOnly
                className={READONLY_FIELD_CLASS_NAME}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Location">
              <select
                value={draft.locationId}
                onChange={(event) => onFieldChange("locationId", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={disabled || !draft.warehouseId}
              >
                <option value="">
                  {draft.warehouseId ? "Select Location" : "Select warehouse first"}
                </option>
                {locationOptions.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.shortCode}
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
              <RecordStaticFieldValue>
                {inventory.cost ? `${RECORD_CURRENCY_PREFIX}${inventory.cost}` : "-"}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Freight">
              <RecordStaticFieldValue>
                {inventory.freight ? `${RECORD_CURRENCY_PREFIX}${inventory.freight}` : "-"}
              </RecordStaticFieldValue>
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
