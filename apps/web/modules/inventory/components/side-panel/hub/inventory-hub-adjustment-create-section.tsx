"use client"

import { AdjustmentEditFormFields } from "@/modules/adjustments/components/adjustment-edit-panel/adjustment-edit-form-fields"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

/**
 * Hub-scoped manual adjustment create body — a direction picker
 * (INCREASE / DEDUCTION) + amount + notes. The parent inventory is the hub
 * context (no inventory picker), so the amount cell's unit comes from the
 * inventory snapshot. Save / Discard live in the panel's sticky `topToolbar`.
 */
export function InventoryHubAdjustmentCreateSection({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { adjustmentPanel, inventory } = controller
  const open = adjustmentPanel.open
  if (!open || open.mode !== "create" || open.variant !== "manual") return null

  return (
    <AdjustmentEditFormFields
      mode="manual-create"
      adjustment={null}
      controller={adjustmentPanel}
      stockUnit={inventory?.stockUnitAbbrev ?? ""}
    />
  )
}
