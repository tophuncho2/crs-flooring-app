"use client"

import { TextCell } from "@/components/cells"
import { StaticFieldValue } from "@/components/fields"
import {
  formatFifoReceivedAtEastern,
  INVENTORY_INTERNAL_NOTES_MAX,
  type InventoryForm,
  type InventoryRow,
} from "@builders/domain"
import { InventoryField } from "./inventory-field"
import { InventoryGroup } from "./inventory-group"

/**
 * Group 3: Internal. Top row is a three-column inline of Import # · PO
 * # · FIFO Received. Internal Notes sits below, spanning the full
 * width. All four are internal-only operations data — never
 * customer-facing.
 */
export function InventoryInternalGroup({
  editable,
  inventory,
  draft,
  onFieldChange,
}: {
  editable: boolean
  inventory: InventoryRow
  draft: InventoryForm
  onFieldChange: (field: keyof InventoryForm, value: string | boolean) => void
}) {
  return (
    <InventoryGroup title="Internal">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <InventoryField label="Import #">
            <StaticFieldValue>{inventory.importNumber || "—"}</StaticFieldValue>
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
        <InventoryField
          label="Internal Notes"
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
      </div>
    </InventoryGroup>
  )
}
