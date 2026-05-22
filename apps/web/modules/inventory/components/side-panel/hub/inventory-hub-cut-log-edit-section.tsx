"use client"

import { CutLogEditFormFields } from "@/modules/cut-logs/components/cut-log-edit-panel/cut-log-edit-form-fields"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryHubCutLogEditHeader } from "./inventory-hub-cut-log-edit-header"

/**
 * Hub-scoped cut-log edit body. Mirrors the standalone panel's structure
 * but uses the hub's takeover-style relink header: WO + WOMI render as
 * `HubSidePanelPickerTrigger` buttons that swap the body into a
 * `HubSidePanelPicker` view, matching the template-sync / property-hub
 * picker-takeover pattern. The inventory picker is gated to create mode
 * (and standalone-panel-only) and never renders here — cut-log inventory
 * is immutable post-create on every edit surface.
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
      <InventoryHubCutLogEditHeader
        cutLog={open.cutLog}
        cutLogPanel={cutLogPanel}
        hubController={controller}
      />
      <CutLogEditFormFields
        mode="edit"
        cutLog={open.cutLog}
        controller={cutLogPanel}
      />
    </div>
  )
}
