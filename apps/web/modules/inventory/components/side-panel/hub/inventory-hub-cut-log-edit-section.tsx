"use client"

import { CutLogEditFormFields } from "@/modules/cut-logs/components/cut-log-edit-panel/cut-log-edit-form-fields"
import { CutLogEditHeader } from "@/modules/cut-logs/components/cut-log-edit-panel/cut-log-edit-header"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

/**
 * Hub-scoped cut-log edit body. Mirrors the standalone panel's structure:
 * the `CutLogEditHeader` (WO relink picker, WOMI relink picker, status
 * badge, final-sequence read-out) above the `CutLogEditFormFields`
 * (readonly summary + three editable cells). The inventory picker section
 * is gated to create mode and never renders here (cut-log inventory is
 * immutable post-create on every edit surface).
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
    <div className="flex flex-col gap-4">
      <CutLogEditHeader cutLog={open.cutLog} controller={cutLogPanel} />
      <CutLogEditFormFields
        mode="edit"
        cutLog={open.cutLog}
        controller={cutLogPanel}
      />
    </div>
  )
}
