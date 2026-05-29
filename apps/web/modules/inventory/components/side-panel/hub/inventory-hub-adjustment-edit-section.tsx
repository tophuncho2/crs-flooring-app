"use client"

import { CutLogEditFormFields } from "@/modules/cut-logs/components/cut-log-edit-panel/cut-log-edit-form-fields"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

/**
 * Hub-scoped cut-log edit body — the cells only. The relink header
 * (WO + WOMI triggers + status + final-cut sequence) lives in the
 * panel's sticky `topToolbar` so it stays visible while the body swaps
 * to a picker takeover (template-sync pattern). The inventory picker is
 * gated to create mode and never renders here — cut-log inventory is
 * immutable post-create on every edit surface.
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
