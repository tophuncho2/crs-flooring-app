"use client"

import { TextCell } from "@/engines/record-view"
import { StaticFieldValue } from "@/engines/record-view"
import {
  INVENTORY_INTERNAL_NOTES_MAX,
  INVENTORY_LOCATION_MAX,
  type InventoryForm,
  type InventoryRow,
} from "@builders/domain"
import { InventoryArchiveChip } from "../controls/inventory-archive-chip"
import { InventoryField } from "./inventory-field"
import { InventoryGroup } from "./inventory-group"

/**
 * The record view's inventory cells group — one card laid out as a two-column
 * grid (Location, Internal Notes, Warehouse, Category, then the stock/coverage
 * derived fields). The identity/derived fields now duplicated by the reference
 * header row (Product, Inv #, Import #, PO #, FIFO, Updated) have been removed;
 * pairing/layout of the remaining fields is a pending follow-up.
 *
 * Only Location + Internal Notes (and the archive chip in the header) are
 * editable; everything else is identity / derived data rendered static. The
 * `editable` flag drives both the read-only view and the section-edit mode off
 * one component.
 */
export function InventoryDetailsGroup({
  editable,
  inventory,
  draft,
  warehouseName,
  onFieldChange,
  title = "Inventory",
  tone = "blue",
}: {
  editable: boolean
  inventory: InventoryRow
  draft: InventoryForm
  warehouseName: string | null
  onFieldChange: (field: keyof InventoryForm, value: string | boolean) => void
  title?: string
  tone?: "blue" | "red"
}) {
  return (
    <InventoryGroup
      title={title}
      tone={tone}
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

        <InventoryField label="Roll #">
          <StaticFieldValue>{inventory.rollNumber || "—"}</StaticFieldValue>
        </InventoryField>

        <InventoryField label="Dye Lot">
          <StaticFieldValue>{inventory.dyeLot || "—"}</StaticFieldValue>
        </InventoryField>

        <InventoryField label="Note">
          <StaticFieldValue>{inventory.note || "—"}</StaticFieldValue>
        </InventoryField>
      </div>
    </InventoryGroup>
  )
}
