"use client"

import { TextCell, UnitCell } from "@/components/cells"
import {
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
  toInventoryForm,
} from "@builders/domain"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryDetailsGroup } from "../../record/primary/groups/inventory-details-group"
import { InventoryField } from "../../record/primary/groups/inventory-field"
import { InventoryGroup } from "../../record/primary/groups/inventory-group"

const NOOP = () => {}

/**
 * Duplicate-inventory form, shown when the hub is in
 * `section-duplicate-inventory` mode. Two stacked groups:
 *   1. "Duplicate inventory item" — the five editable cells the user sets on
 *      the new row (roll# / note seeded from the source; starting stock /
 *      location / internal notes blank).
 *   2. "Reference inventory" (red) — the source row rendered read-only with
 *      the same cells as the hub view (`InventoryDetailsGroup`), so the
 *      operator can see what they're cloning while they type.
 *
 * Everything not editable here is pasted server-side; total cut, archive, and
 * import #/PO # do NOT carry (the new row starts un-cut, active, import-less).
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
    <div className="flex flex-col gap-4">
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
            <UnitCell
              editable={editable}
              value={form.startingStock}
              onChange={(value) => setField("startingStock", value)}
              unit={inventory.stockUnitAbbrev}
              align="start"
              placeholder="0.00"
              ariaLabel="Starting stock"
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
        </div>
      </InventoryGroup>

      {/* Read-only source row — same cells as the hub view, red-shaded. */}
      <InventoryDetailsGroup
        editable={false}
        inventory={inventory}
        draft={toInventoryForm(inventory)}
        warehouseName={warehouseName}
        onFieldChange={NOOP}
        title="Reference inventory"
        tone="red"
      />
    </div>
  )
}
