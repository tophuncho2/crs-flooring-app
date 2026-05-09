"use client"

import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
import { TextCell, TextareaCell } from "@/components/cells"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  formatInventoryImportNumber,
  formatInventoryQuantity,
  type InventoryForm,
  type InventoryRow,
} from "@builders/domain"

export function InventoryPrimaryFieldsSection({
  inventory,
  draft,
  warehouseName,
  disabled,
  onFieldChange,
}: {
  inventory: InventoryRow
  draft: InventoryForm
  warehouseName: string | null
  disabled: boolean
  onFieldChange: (field: keyof InventoryForm, value: string) => void
}) {
  const editable = !disabled

  return (
    <FieldSection>
      {/* Row 1: Product · Import # */}
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

      {/* Row 2: Warehouse · Starting Balance · Cut Balance */}
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
        <FormField label="Starting Balance">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.startingStock, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={5} row={2} colSpan={2}>
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
