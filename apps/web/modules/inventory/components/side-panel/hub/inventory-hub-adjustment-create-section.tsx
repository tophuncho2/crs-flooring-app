"use client"

import { AdjustmentEditFormFields } from "@/modules/adjustments/components/adjustment-edit-panel/adjustment-edit-form-fields"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

/**
 * Hub-scoped adjustment create body — direction picker (INCREASE / DEDUCTION)
 * + amount + waste + notes. Warehouse / inventory / location are locked pickers
 * in the sticky header (seeded from the hub's inventory); the WO picker stays
 * editable. The amount cell's unit comes from the seeded stock-unit snapshot.
 */
export function InventoryHubAdjustmentCreateSection({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { adjustmentPanel } = controller
  const open = adjustmentPanel.open
  if (!open || open.mode !== "create") return null

  return (
    <AdjustmentEditFormFields mode="create" adjustment={null} controller={adjustmentPanel} />
  )
}
