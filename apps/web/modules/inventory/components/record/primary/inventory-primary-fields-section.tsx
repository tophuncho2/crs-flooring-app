"use client"

import type { InventoryForm } from "@builders/domain"
import { CellAt } from "@/engines/record-view"
import {
  InventoryFieldGrid,
  InternalNotesField,
  LocationField,
  StatusField,
  WarehouseStaticField,
} from "../fields"

/**
 * The inventory "cells" grid for the record view's primary section, built on the
 * shared inventory field package (`../fields`) over the record-view engine.
 * Only Location, Internal Notes, and the archive (Status) chip are editable;
 * Warehouse renders static. Identity / derived fields are surfaced by the
 * reference header row, not repeated here. Analog of
 * `ManufacturerPrimaryFieldsSection`.
 */
export function InventoryPrimaryFieldsSection({
  draft,
  warehouseName,
  editable,
  onFieldChange,
}: {
  draft: InventoryForm
  warehouseName: string | null
  editable: boolean
  onFieldChange: (field: keyof InventoryForm, value: string | boolean) => void
}) {
  return (
    <InventoryFieldGrid>
      <CellAt col={1} colSpan={4}>
        <LocationField
          editable={editable}
          value={draft.location}
          onChange={(value) => onFieldChange("location", value)}
        />
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <StatusField
          editable={editable}
          value={draft.isArchived}
          onChange={(next) => onFieldChange("isArchived", next)}
        />
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <InternalNotesField
          editable={editable}
          value={draft.internalNotes}
          onChange={(value) => onFieldChange("internalNotes", value)}
        />
      </CellAt>
      <CellAt col={1} colSpan={4}>
        <WarehouseStaticField warehouseName={warehouseName} />
      </CellAt>
    </InventoryFieldGrid>
  )
}
