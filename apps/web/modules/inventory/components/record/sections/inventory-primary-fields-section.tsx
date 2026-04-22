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
  const isReadOnly = !inventory.isImported
  const controlDisabled = disabled || isReadOnly
  return (
    <RecordPrimarySection>
      {isReadOnly ? (
        <div className="col-span-full rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          This inventory row is pending import. It becomes editable once marked
          as <strong>Final</strong> on the imports record view.
        </div>
      ) : null}
      <RecordPrimaryPane variant="side" placement="left">
        <RecordPrimaryFieldsGrid variant="side">
          <RecordPrimaryFieldCell>
            <RecordFormField label="Warehouse">
              <select
                aria-label="Warehouse"
                value={draft.warehouseId}
                onChange={(event) => onFieldChange("warehouseId", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={controlDisabled}
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
                {formatInventoryQuantity(inventory.stockCount, inventory.stockUnit)}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Cut Balance">
              <RecordStaticFieldValue>
                {formatInventoryQuantity(inventory.totalCutBalance, inventory.stockUnit)}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Uncut Balance">
              <RecordStaticFieldValue>
                {formatInventoryQuantity(inventory.uncutBalance, inventory.stockUnit)}
              </RecordStaticFieldValue>
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell>
            <RecordFormField label="Available Balance">
              <RecordStaticFieldValue>
                {formatInventoryQuantity(inventory.availableBalance, inventory.stockUnit)}
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
                disabled={controlDisabled || !draft.warehouseId}
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
                disabled={controlDisabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
          <RecordPrimaryFieldCell size="sm">
            <RecordFormField label="Lot">
              <input
                value={draft.dyeLot}
                onChange={(event) => onFieldChange("dyeLot", event.target.value)}
                className={RECORD_FIELD_CONTROL_CLASS_NAME}
                disabled={controlDisabled}
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
                  disabled={controlDisabled}
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
                  disabled={controlDisabled}
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
                disabled={controlDisabled}
              />
            </RecordFormField>
          </RecordPrimaryFieldCell>
        </RecordPrimaryFieldsGrid>
      </RecordPrimaryPane>
    </RecordPrimarySection>
  )
}
