"use client"

import { TextCell, UnitCell } from "@/components/cells"
import {
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  INVENTORY_NOTE_MAX,
  INVENTORY_ROLL_NUMBER_MAX,
  type InventoryRow,
} from "@builders/domain"
import {
  RecordReferenceHeader,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { InventoryDuplicateForm } from "@/modules/inventory/controllers/record/duplicate/use-inventory-duplicate-section"
import { InventoryReferenceRow } from "../header/inventory-reference-row"
import { InventoryField } from "../primary/groups/inventory-field"
import { InventoryGroup } from "../primary/groups/inventory-group"

/**
 * Presentational body for the duplicate-inventory flow — the editable
 * "Duplicate inventory item" group (roll# / starting stock / note / location /
 * internal notes) over a locked reference header showing the source row (the
 * same chrome the record view uses, no Change/Clear — reselecting the reference
 * is a later step).
 *
 * Controller-agnostic: takes the draft form + a `setField` writer + the source
 * snapshot, so both the record-view embedded duplicate face and the (dormant)
 * hub duplicate section render identically.
 */
export function InventoryDuplicateFields({
  page,
  inventory,
  form,
  setField,
  editable,
}: {
  page: RecordDetailClientScaffoldContext
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

      {/* Locked reference header — the source row in the same chrome the record
          view uses; reselecting the reference is a later step. */}
      <RecordReferenceHeader page={page} label="Reference inventory">
        {() => <InventoryReferenceRow inventory={inventory} />}
      </RecordReferenceHeader>
    </div>
  )
}
