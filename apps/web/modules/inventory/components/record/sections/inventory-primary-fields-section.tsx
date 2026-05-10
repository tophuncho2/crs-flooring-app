"use client"

import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField, StaticFieldValue } from "@/components/fields"
import { CheckboxCell, TextCell, TextareaCell } from "@/components/cells"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import {
  formatFifoReceivedAtEastern,
  formatInventoryQuantity,
  type InventoryForm,
  type InventoryRow,
} from "@builders/domain"

/**
 * Inline static `ROLL` prefix decoration: a fixed badge to the left of a
 * plain TextCell. Form value binds raw to `draft.rollNumber` — no
 * client-side stripping or transformation. The cell is purely a visual hint
 * that "ROLL" is the convention; the inventory update use case prepends
 * `ROLL` to non-empty values on save.
 */
function RollNumberInputCell({
  value,
  editable,
  onChange,
}: {
  value: string
  editable: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-stretch gap-1">
      <span
        aria-hidden="true"
        className="inline-flex items-center rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 text-xs font-semibold tracking-wide text-[var(--text-muted)]"
      >
        ROLL
      </span>
      <div className="flex-1">
        <TextCell editable={editable} value={value} onChange={onChange} ariaLabel="Roll number" />
      </div>
    </div>
  )
}

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

      {/* Row 2: Import # · PO # · FIFO Received */}
      <CellAt col={1} row={2} colSpan={2}>
        <FormField label="Import #">
          <StaticFieldValue>{inventory.importNumber || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={3} row={2} colSpan={2}>
        <FormField label="PO #">
          <StaticFieldValue>{inventory.purchaseOrderNumber || "—"}</StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={5} row={2} colSpan={2}>
        <FormField label="FIFO Received">
          <StaticFieldValue>
            {inventory.fifoReceivedAt ? formatFifoReceivedAtEastern(inventory.fifoReceivedAt) : "—"}
          </StaticFieldValue>
        </FormField>
      </CellAt>

      {/* Row 3: Warehouse · Roll # · Dye Lot */}
      <CellAt col={1} row={3} colSpan={2}>
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
      <CellAt col={3} row={3} colSpan={2}>
        <FormField label="Roll #">
          <RollNumberInputCell
            editable={editable}
            value={draft.rollNumber}
            onChange={(value) => onFieldChange("rollNumber", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={5} row={3} colSpan={2}>
        <FormField label="Dye Lot">
          <TextCell
            editable={editable}
            value={draft.dyeLot}
            onChange={(value) => onFieldChange("dyeLot", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={7} row={3} colSpan={2}>
        <FormField label="Location">
          <TextCell
            editable={editable}
            value={draft.location}
            onChange={(value) => onFieldChange("location", value)}
          />
        </FormField>
      </CellAt>

      {/* Row 4: Starting Stock · Total Cut · Stock Balance · Coverage Balance */}
      <CellAt col={1} row={4} colSpan={2}>
        <FormField label="Starting Stock">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.startingStock, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={3} row={4} colSpan={2}>
        <FormField label="Total Cut">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.totalCutSum, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </FormField>
      </CellAt>
      <CellAt col={5} row={4} colSpan={2}>
        <FormField label="Stock Balance">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.stockBalance, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </FormField>
      </CellAt>
      {inventory.coverageBalance ? (
        <CellAt col={7} row={4} colSpan={2}>
          <FormField label="Coverage Balance">
            <StaticFieldValue>
              {formatInventoryQuantity(inventory.coverageBalance, inventory.itemCoverageUnitAbbrev)}
            </StaticFieldValue>
          </FormField>
        </CellAt>
      ) : null}

      {/* Row 5: Note (full width) */}
      <CellAt col={1} row={5} colSpan={8}>
        <FormField label="Note">
          <TextareaCell
            editable={editable}
            value={draft.note}
            onChange={(value) => onFieldChange("note", value)}
            rows={2}
          />
        </FormField>
      </CellAt>

      {/* Row 6: Internal Notes (full width) · Archived toggle */}
      <CellAt col={1} row={6} colSpan={6}>
        <FormField label="Internal Notes">
          <TextCell
            editable={editable}
            value={draft.internalNotes}
            onChange={(value) => onFieldChange("internalNotes", value)}
          />
        </FormField>
      </CellAt>
      <CellAt col={7} row={6} colSpan={2}>
        <FormField label="Archived">
          <CheckboxCell
            editable={editable}
            value={draft.isArchived}
            onChange={(value) => onFieldChange("isArchived", value)}
            ariaLabel="Archived"
          />
        </FormField>
      </CellAt>
    </FieldSection>
  )
}
