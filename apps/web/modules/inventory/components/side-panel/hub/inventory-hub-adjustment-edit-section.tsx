"use client"

import { AdjustmentEditFormFields } from "@/modules/adjustments/components/adjustment-edit-panel/adjustment-edit-form-fields"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

/**
 * Hub-scoped adjustment edit body — the cells only. The relink header
 * (WO + WOMI triggers + status + final-cut sequence) lives in the
 * panel's sticky `topToolbar` so it stays visible while the body swaps
 * to a picker takeover (template-sync pattern). The inventory picker is
 * gated to create mode and never renders here — adjustment inventory is
 * immutable post-create on every edit surface.
 */
export function InventoryHubAdjustmentEditSection({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { adjustmentPanel } = controller
  const open = adjustmentPanel.open
  if (!open || open.mode !== "edit") return null

  return (
    <AdjustmentEditFormFields
      mode="edit"
      adjustment={open.adjustment}
      controller={adjustmentPanel}
    />
  )
}
