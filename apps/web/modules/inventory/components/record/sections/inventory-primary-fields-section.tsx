"use client"

import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
import { SelectCell, TextCell, TextareaCell } from "@/components/cells"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  formatInventoryImportNumber,
  formatInventoryQuantity,
  type InventoryForm,
  type InventoryLocationOption,
  type InventoryRow,
} from "@builders/domain"

export function InventoryPrimaryFieldsSection({
  inventory,
  draft,
  locationOptions,
  warehouseName,
  selectedLocation,
  disabled,
  onFieldChange,
}: {
  inventory: InventoryRow
  draft: InventoryForm
  locationOptions: InventoryLocationOption[]
  warehouseName: string | null
  selectedLocation: InventoryLocationOption | null
  disabled: boolean
  onFieldChange: (field: keyof InventoryForm, value: string) => void
}) {
  const editable = !disabled
  const locationPlaceholder = draft.warehouseId ? "Select Location" : "Select warehouse first"

  return (
    <FieldSection>
      {/* Row 1: Product · Import # · Full Location */}
      <CellAt col={1} row={1} colSpan={4}>
        <FormField label="Product">
          <TextCell editable={false} value={inventory.productName} />
        </FormField>
      </CellAt>
      <CellAt col={5} row={1} colSpan={2}>
        <FormField label="Import #">
          <TextCell editable={false} value={formatInventoryImportNumber(inventory.importNumber)} />
        </FormField>
      </CellAt>
      <CellAt col={7} row={1} colSpan={2}>
        <FormField label="Full Location">
          <StaticFieldValue>{selectedLocation?.locationCode || "-"}</StaticFieldValue>
        </FormField>
      </CellAt>

      {/* Row 2: Warehouse · Location · Starting Balance · Cut Balance */}
      <CellAt col={1} row={2} colSpan={2}>
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
      <CellAt col={3} row={2} colSpan={2}>
        <FormField label="Location">
          <SelectCell
            editable={editable && Boolean(draft.warehouseId)}
            value={draft.locationId}
            onChange={(value) => onFieldChange("locationId", value)}
            options={locationOptions.map((location) => ({ value: location.id, label: location.shortCode }))}
            placeholder={locationPlaceholder}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={2} colSpan={2}>
        <FormField label="Starting Balance">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.startingStock, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={7} row={2} colSpan={2}>
        <FormField label="Cut Balance">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.totalCutSum, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </FormField>
      </CellAt>

      {/* Row 3: Lot · Item # · Available · Coverage (conditional) */}
      <CellAt col={1} row={3} colSpan={2}>
        <FormField label="Lot">
          <TextCell
            editable={editable}
            value={draft.dyeLot}
            onChange={(value) => onFieldChange("dyeLot", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={3} row={3} colSpan={2}>
        <FormField label="Item #">
          <TextCell
            editable={editable}
            value={draft.itemNumber}
            onChange={(value) => onFieldChange("itemNumber", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={3} colSpan={2}>
        <FormField label="Available">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.stockBalance, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </FormField>
      </CellAt>
      {inventory.coverageBalance ? (
        <CellAt col={7} row={3} colSpan={2}>
          <FormField label="Coverage">
            <StaticFieldValue>
              {formatInventoryQuantity(inventory.coverageBalance, inventory.itemCoverageUnitAbbrev)}
            </StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}

      {/* Row 4: Notes (full width) */}
      <CellAt col={1} row={4} colSpan={8}>
        <FormField label="Notes">
          <TextareaCell
            editable={editable}
            value={draft.notes}
            onChange={(value) => onFieldChange("notes", value)}
            rows={2}
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
