"use client"

import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryDuplicateFields } from "../../record/duplicate/inventory-duplicate-fields"

/**
 * Duplicate-inventory form, shown when the hub is in
 * `section-duplicate-inventory` mode. The body (the editable "Duplicate
 * inventory item" group + the read-only red "Reference inventory" group) lives
 * in the shared {@link InventoryDuplicateFields}, also used by the record view's
 * embedded duplicate face. This dormant hub wrapper just feeds it the slice.
 */
export function InventoryHubInventoryDuplicateSection({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { inventory, warehouseName, inventoryDuplicate, isSaving } = controller
  if (!inventory) return null

  return (
    <InventoryDuplicateFields
      inventory={inventory}
      warehouseName={warehouseName}
      form={inventoryDuplicate.form}
      setField={inventoryDuplicate.setField}
      editable={!isSaving}
    />
  )
}
