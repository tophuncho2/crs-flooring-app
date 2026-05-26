"use client"

import { TextCell } from "@/components/cells"
import { StaticFieldValue } from "@/components/fields"
import {
  formatInventoryQuantity,
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
} from "@builders/domain"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryField } from "../../record/primary/groups/inventory-field"
import { InventoryGroup } from "../../record/primary/groups/inventory-group"

/**
 * Duplicate-inventory form, shown when the hub is in
 * `section-duplicate-inventory` mode. Five editable cells (roll# / starting
 * stock / note / location / internal notes) seed-filled from the source
 * (location + internal notes start blank); the rest is pasted server-side and
 * surfaced here as a read-only preview so the operator sees what they're
 * cloning. Total cut, archive, and import #/PO # do NOT carry — they're not
 * shown because the new row starts un-cut, active, and import-less.
 */
export function InventoryHubInventoryDuplicateSection({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { inventory, warehouseName, inventoryDuplicate, isSaving } = controller
  if (!inventory) return null
  const editable = !isSaving
  const { form, setField } = inventoryDuplicate

  return (
    <InventoryGroup title="Duplicate inventory item">
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <InventoryField label="Roll #">
          <TextCell
            editable={editable}
            value={form.rollNumber}
            onChange={(value) => setField("rollNumber", value)}
            maxLength={INVENTORY_ROLL_NUMBER_MAX}
          />
        </InventoryField>
        <InventoryField label="Starting Stock">
          <TextCell
            editable={editable}
            value={form.startingStock}
            onChange={(value) => setField("startingStock", value)}
            placeholder="0.00"
          />
        </InventoryField>

        <InventoryField label="Note">
          <TextCell
            editable={editable}
            value={form.note}
            onChange={(value) => setField("note", value)}
            maxLength={INVENTORY_NOTE_MAX}
          />
        </InventoryField>
        <InventoryField label="Location">
          <TextCell
            editable={editable}
            value={form.location}
            onChange={(value) => setField("location", value)}
            maxLength={INVENTORY_LOCATION_MAX}
          />
        </InventoryField>

        <InventoryField
          label="Internal Notes"
          className="col-span-2"
          editable={editable}
          currentLength={form.internalNotes.length}
          maxLength={INVENTORY_INTERNAL_NOTES_MAX}
        >
          <TextCell
            editable={editable}
            value={form.internalNotes}
            onChange={(value) => setField("internalNotes", value)}
            maxLength={INVENTORY_INTERNAL_NOTES_MAX}
          />
        </InventoryField>

        {/* Pasted from the source — read-only preview. */}
        <InventoryField label="Warehouse">
          <StaticFieldValue>{warehouseName || "—"}</StaticFieldValue>
        </InventoryField>
        <InventoryField label="Category">
          <StaticFieldValue>{inventory.categoryName || "—"}</StaticFieldValue>
        </InventoryField>

        <InventoryField label="Product" className="col-span-2">
          <StaticFieldValue>{inventory.productName || "—"}</StaticFieldValue>
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
      </div>
    </InventoryGroup>
  )
}
