"use client"

import type { InventoryForm } from "@builders/domain"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryDetailsGroup } from "../../record/primary/groups/inventory-details-group"

/**
 * Editable inventory cells used when the hub is in
 * `section-edit-inventory` mode. Reuses the same three groups as the
 * record-view primary section, with the slice's form acting as the
 * draft source. Stock-group's location TextCell becomes editable, the
 * internal-group's internalNotes TextCell becomes editable, and the
 * archive chip in the stock-group header becomes interactive. Product
 * group fields stay UI-blocked (roll# / dye lot / note) — matches the
 * record view's static treatment for those columns.
 */
export function InventoryHubInventoryEditSection({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { inventory, warehouseName, inventoryEdit, isSaving } = controller
  if (!inventory) return null
  const editable = !isSaving

  const onFieldChange = (field: keyof InventoryForm, value: string | boolean) => {
    // Two-arg dispatcher matching the record-view group contract — the
    // slice's setField unifies string + boolean writes via the field tag.
    inventoryEdit.setField(field, value as InventoryForm[typeof field])
  }

  return (
    <InventoryDetailsGroup
      editable={editable}
      inventory={inventory}
      draft={inventoryEdit.form}
      warehouseName={warehouseName}
      onFieldChange={onFieldChange}
    />
  )
}
