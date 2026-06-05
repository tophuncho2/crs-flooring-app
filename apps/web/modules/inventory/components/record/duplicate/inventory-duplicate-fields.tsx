"use client"

import { TextCell, UnitCell } from "@/components/cells"
import {
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
  toInventoryForm,
  type InventoryRow,
} from "@builders/domain"
import type { InventoryDuplicateForm } from "@/modules/inventory/controllers/inventory-hub-side-panel/use-hub-inventory-duplicate"
import { InventoryDetailsGroup } from "../primary/groups/inventory-details-group"
import { InventoryField } from "../primary/groups/inventory-field"
import { InventoryGroup } from "../primary/groups/inventory-group"

const NOOP = () => {}

/**
 * Presentational body for the duplicate-inventory flow — two stacked groups:
 *   1. "Duplicate inventory item" — the five editable cells the operator sets on
 *      the new row (roll# / starting stock / note / location / internal notes).
 *   2. "Reference inventory" (red) — the source row rendered read-only via the
 *      shared {@link InventoryDetailsGroup} so the operator can see what they're
 *      cloning while they type.
 *
 * Controller-agnostic: takes the draft form + a `setField` writer + the source
 * snapshot, so both the record-view embedded duplicate face and the (dormant)
 * hub duplicate section render identically.
 */
export function InventoryDuplicateFields({
  inventory,
  warehouseName,
  form,
  setField,
  editable,
}: {
  inventory: InventoryRow
  warehouseName: string | null
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

      {/* Read-only source row — same cells as the record view, red-shaded. */}
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
