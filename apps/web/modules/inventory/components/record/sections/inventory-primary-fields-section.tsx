"use client"

import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
import { CheckboxCell, TextCell } from "@/components/cells"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  formatFifoReceivedAtEastern,
  formatInventoryQuantity,
  INVENTORY_DYE_LOT_MAX,
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
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
  onFieldChange: (field: keyof InventoryForm, value: string | boolean) => void
}) {
  const editable = !disabled

  return (
    <FieldSection>
      {/* Row 1: Inv # · Product · Category */}
      <CellAt col={1} row={1} colSpan={2}>
        <FormField label="Inv #">
          <StaticFieldValue>{inventory.inventoryNumber}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={3} row={1} colSpan={4}>
        <FormField label="Product">
          <StaticFieldValue>{inventory.productName || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={7} row={1} colSpan={2}>
        <FormField label="Category">
          <StaticFieldValue>{inventory.categoryName || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>

      {/* Row 2: Warehouse · Location · Stock Balance · Coverage Balance */}
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
          <TextCell
            editable={editable}
            value={draft.location}
            onChange={(value) => onFieldChange("location", value)}
            maxLength={INVENTORY_LOCATION_MAX}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={2} colSpan={2}>
        <FormField label="Stock Balance">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.stockBalance, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={7} row={2} colSpan={2}>
        <FormField label="Coverage Balance">
          <StaticFieldValue>
            {inventory.coverageBalance
              ? formatInventoryQuantity(inventory.coverageBalance, inventory.itemCoverageUnitAbbrev)
              : "—"}
          </StaticFieldValue>
        </FormField>
      </CellAt>

      {/* Row 3: Roll # · Dye Lot · Total Cut · FIFO Received */}
      <CellAt col={1} row={3} colSpan={2}>
        <FormField label="Roll #">
          <TextCell
            editable={editable}
            value={draft.rollNumber}
            onChange={(value) => onFieldChange("rollNumber", value)}
            maxLength={INVENTORY_ROLL_NUMBER_MAX}
          />
        </FormField>
      </CellAt>
      <CellAt col={3} row={3} colSpan={2}>
        <FormField label="Dye Lot">
          <TextCell
            editable={editable}
            value={draft.dyeLot}
            onChange={(value) => onFieldChange("dyeLot", value)}
            maxLength={INVENTORY_DYE_LOT_MAX}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={3} colSpan={2}>
        <FormField label="Total Cut">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.totalCutSum, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={7} row={3} colSpan={2}>
        <FormField label="FIFO Received">
          <StaticFieldValue>
            {inventory.fifoReceivedAt ? formatFifoReceivedAtEastern(inventory.fifoReceivedAt) : "—"}
          </StaticFieldValue>
        </FormField>
      </CellAt>

      {/* Row 4: Note · Starting Stock · Import # */}
      <CellAt col={1} row={4} colSpan={4}>
        <FormField label="Note">
          <TextCell
            editable={editable}
            value={draft.note}
            onChange={(value) => onFieldChange("note", value)}
            maxLength={INVENTORY_NOTE_MAX}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={4} colSpan={2}>
        <FormField label="Starting Stock">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.startingStock, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={7} row={4} colSpan={2}>
        <FormField label="Import #">
          <StaticFieldValue>{inventory.importNumber || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>

      {/* Row 5: Internal Notes · Archived · PO # */}
      <CellAt col={1} row={5} colSpan={4}>
        <FormField label="Internal Notes">
          <TextCell
            editable={editable}
            value={draft.internalNotes}
            onChange={(value) => onFieldChange("internalNotes", value)}
            maxLength={INVENTORY_INTERNAL_NOTES_MAX}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={5} colSpan={2}>
        <FormField label="Archived">
          <CheckboxCell
            editable={editable}
            value={draft.isArchived}
            onChange={(value) => onFieldChange("isArchived", value)}
            ariaLabel="Archived"
          />
        </FormField>
      </CellAt>
      <CellAt col={7} row={5} colSpan={2}>
        <FormField label="PO #">
          <StaticFieldValue>{inventory.purchaseOrderNumber || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
