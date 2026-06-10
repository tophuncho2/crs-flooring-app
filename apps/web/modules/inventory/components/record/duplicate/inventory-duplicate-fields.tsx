"use client"

import type { InventoryRow } from "@builders/domain"
import { CellAt } from "@/engines/record-view"
import type { InventoryDuplicateForm } from "@/modules/inventory/controllers/record/duplicate/use-inventory-duplicate-section"
import {
  InternalNotesField,
  InventoryFieldGrid,
  LocationField,
  NoteField,
  RollNumberField,
  StartingStockField,
} from "../fields"

/**
 * Presentational body for the duplicate-inventory flow — the editable
 * roll# / starting stock / note / location / internal notes cells, built on the
 * shared inventory field package (`../fields`) over the record-view engine. The
 * locked source-row reference header is rendered by the panel above the section
 * controls (mirroring the record view's layout).
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
    <InventoryFieldGrid>
      <CellAt col={1} colSpan={8}>
        <RollNumberField
          editable={editable}
          value={form.rollNumber}
          onChange={(value) => setField("rollNumber", value)}
        />
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <StartingStockField
          editable={editable}
          value={form.startingStock}
          onChange={(value) => setField("startingStock", value)}
          unit={inventory.stockUnitAbbrev}
        />
      </CellAt>

      <CellAt col={1} colSpan={8}>
        <NoteField editable={editable} value={form.note} onChange={(value) => setField("note", value)} />
      </CellAt>
      <CellAt col={1} colSpan={8}>
        <LocationField
          editable={editable}
          value={form.location}
          onChange={(value) => setField("location", value)}
        />
      </CellAt>

      <CellAt col={1} colSpan={8}>
        <InternalNotesField
          editable={editable}
          value={form.internalNotes}
          onChange={(value) => setField("internalNotes", value)}
        />
      </CellAt>
    </InventoryFieldGrid>
  )
}
