"use client"

import { TextCell } from "@/components/cells"
import { StaticFieldValue } from "@/components/fields"
import {
  formatFifoReceivedAtEastern,
  formatInventoryQuantity,
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  type InventoryForm,
  type InventoryRow,
} from "@builders/domain"
import { InventoryArchiveChip } from "../controls/inventory-archive-chip"
import { InventoryField } from "./inventory-field"
import { InventoryGroup } from "./inventory-group"

/**
 * Single consolidated inventory cells group. Replaces the former Stock /
 * Product / Internal trio with one card laid out as a two-column grid:
 *
 *   Location            | —
 *   Internal Notes (full width)
 *   Warehouse           | Category
 *   Product (full width)
 *   Inv #               | Stock Balance
 *   Roll #              | Coverage Balance
 *   Dye Lot             | Coverage Per Unit
 *   Note                | Total Cut
 *   Import #            | Starting Stock
 *   PO #                | FIFO Received
 *
 * Only Location + Internal Notes (and the archive chip in the header) are
 * editable; everything else is identity / derived data rendered static. The
 * `editable` flag drives both the hub's read-only view and its
 * section-edit-inventory mode off one component.
 */
export function InventoryDetailsGroup({
  editable,
  inventory,
  draft,
  warehouseName,
  onFieldChange,
}: {
  editable: boolean
  inventory: InventoryRow
  draft: InventoryForm
  warehouseName: string | null
  onFieldChange: (field: keyof InventoryForm, value: string | boolean) => void
}) {
  return (
    <InventoryGroup
      title="Inventory"
      headerRight={
        <InventoryArchiveChip
          value={draft.isArchived}
          onChange={(next) => onFieldChange("isArchived", next)}
          disabled={!editable}
        />
      }
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <InventoryField label="Location">
          <TextCell
            editable={editable}
            value={draft.location}
            onChange={(value) => onFieldChange("location", value)}
            maxLength={INVENTORY_LOCATION_MAX}
          />
        </InventoryField>

        <InventoryField
          label="Internal Notes"
          className="col-span-2"
          editable={editable}
          currentLength={draft.internalNotes.length}
          maxLength={INVENTORY_INTERNAL_NOTES_MAX}
        >
          <TextCell
            editable={editable}
            value={draft.internalNotes}
            onChange={(value) => onFieldChange("internalNotes", value)}
            maxLength={INVENTORY_INTERNAL_NOTES_MAX}
          />
        </InventoryField>

        <InventoryField label="Warehouse">
          <StaticFieldValue>{warehouseName || "—"}</StaticFieldValue>
        </InventoryField>
        <InventoryField label="Category">
          <StaticFieldValue>{inventory.categoryName || "—"}</StaticFieldValue>
        </InventoryField>

        <InventoryField label="Product" className="col-span-2">
          <StaticFieldValue>{inventory.productName || "—"}</StaticFieldValue>
        </InventoryField>

        <InventoryField label="Inv #">
          <StaticFieldValue>{inventory.inventoryNumber}</StaticFieldValue>
        </InventoryField>
        <InventoryField label="Stock Balance">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.stockBalance, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </InventoryField>

        <InventoryField label="Roll #">
          <StaticFieldValue>{inventory.rollNumber || "—"}</StaticFieldValue>
        </InventoryField>
        <InventoryField label="Coverage Balance">
          <StaticFieldValue>
            {inventory.coverageBalance
              ? formatInventoryQuantity(inventory.coverageBalance, inventory.itemCoverageUnitAbbrev)
              : "—"}
          </StaticFieldValue>
        </InventoryField>

        <InventoryField label="Dye Lot">
          <StaticFieldValue>{inventory.dyeLot || "—"}</StaticFieldValue>
        </InventoryField>
        <InventoryField label="Coverage Per Unit">
          <StaticFieldValue>
            {inventory.coveragePerUnit
              ? formatInventoryQuantity(inventory.coveragePerUnit, inventory.itemCoverageUnitAbbrev)
              : "—"}
          </StaticFieldValue>
        </InventoryField>

        <InventoryField label="Note">
          <StaticFieldValue>{inventory.note || "—"}</StaticFieldValue>
        </InventoryField>
        <InventoryField label="Total Cut">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.totalCutSum, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </InventoryField>

        <InventoryField label="Import #">
          <StaticFieldValue>{inventory.importNumber || "—"}</StaticFieldValue>
        </InventoryField>
        <InventoryField label="Starting Stock">
          <StaticFieldValue>
            {formatInventoryQuantity(inventory.startingStock, inventory.stockUnitAbbrev)}
          </StaticFieldValue>
        </InventoryField>

        <InventoryField label="PO #">
          <StaticFieldValue>{inventory.purchaseOrderNumber || "—"}</StaticFieldValue>
        </InventoryField>
        <InventoryField label="FIFO Received">
          <StaticFieldValue>
            {inventory.fifoReceivedAt ? formatFifoReceivedAtEastern(inventory.fifoReceivedAt) : "—"}
          </StaticFieldValue>
        </InventoryField>
      </div>
    </InventoryGroup>
  )
}
