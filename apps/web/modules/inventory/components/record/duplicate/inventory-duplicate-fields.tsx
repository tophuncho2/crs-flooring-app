"use client"

import { TextCell, UnitCell } from "@/components/cells"
import {
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
  type InventoryRow,
} from "@builders/domain"
import type { InventoryDuplicateForm } from "@/modules/inventory/controllers/record/duplicate/use-inventory-duplicate-section"
import { InventoryField } from "../primary/groups/inventory-field"
import { InventoryGroup } from "../primary/groups/inventory-group"

/**
 * Presentational body for the duplicate-inventory flow — the editable
 * "Duplicate inventory item" group (roll# / starting stock / note / location /
 * internal notes). The locked source-row reference header is rendered by the
 * panel above the section controls (mirroring the record view's layout).
 *
 * Controller-agnostic: takes the draft form + a `setField` writer + the source
 * snapshot, so both the record-view embedded duplicate face and the (dormant)
 * hub duplicate section render identically.
 */
export function InventoryDuplicateFields({
  inventory,
  form,
  setField,
  editable,
}: {
  inventory: InventoryRow
  form: InventoryDuplicateForm
  setField: <K extends keyof InventoryDuplicateForm>(
    field: K,
    value: InventoryDuplicateForm[K],
  ) => void
  editable: boolean
}) {
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
    </div>
  )
}
