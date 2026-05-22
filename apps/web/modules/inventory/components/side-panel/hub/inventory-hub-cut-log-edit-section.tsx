"use client"

import { CutLogEditFormFields } from "@/modules/cut-logs/components/cut-log-edit-panel/cut-log-edit-form-fields"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

/**
 * Hub-scoped cut-log edit fields. Delegates entirely to the standalone
 * panel's `CutLogEditFormFields` in edit mode — the form body is the
 * same readonly summary + three editable cells the operator sees in the
 * work-orders flow. The inventory picker section is gated to create mode
 * and never renders here (cut-log inventory is immutable post-create).
 */
export function InventoryHubCutLogEditSection({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { cutLogPanel } = controller
  const open = cutLogPanel.open
  if (!open || open.mode !== "edit") return null

  return (
    <CutLogEditFormFields
      mode="edit"
      cutLog={open.cutLog}
      controller={cutLogPanel}
    />
  )
}
