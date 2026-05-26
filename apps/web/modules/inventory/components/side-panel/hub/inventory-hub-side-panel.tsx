"use client"

import { HubSidePanelShell } from "@/components/hub-side-panel"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryHubCutLogEditSection } from "./inventory-hub-cut-log-edit-section"
import { InventoryHubCutLogsListSection } from "./inventory-hub-cut-logs-list-section"
import { InventoryHubCutLogWorkOrderPicker } from "./inventory-hub-cut-log-work-order-picker"
import { InventoryHubInventoryEditSection } from "./inventory-hub-inventory-edit-section"
import { InventoryHubViewSection } from "./inventory-hub-view-section"
import { useInventoryHubChrome } from "./use-inventory-hub-chrome"

export type InventoryHubSidePanelProps = {
  controller: InventoryHubSidePanelController
}

/**
 * Right-anchored inventory hub side panel. Mirrors the property hub
 * pattern at `modules/properties/components/side-panel/hub/`:
 *
 *   - view: read-only cells card on top, paginated cut-logs list below
 *   - section-edit-inventory: editable cells with archive / location /
 *           internalNotes mutations; roll# / dye lot / note stay
 *           UI-blocked
 *   - section-edit-cut-log: cut-log readonly summary + cut / notes /
 *           waste editable cells; toolbar exposes Save / Discard /
 *           Finalize / Void / Delete + back-arrow
 *   - picker-takeover: body swaps to a HubSidePanelPicker; the cut-log
 *           relink header stays sticky above via `useInventoryHubChrome`
 *
 * Per-mode chrome (title + topToolbar) lives in `useInventoryHubChrome`
 * — this file is the body dispatch only.
 */
export function InventoryHubSidePanel({ controller }: InventoryHubSidePanelProps) {
  const {
    isOpen,
    mode,
    inventory,
    close,
    isLoadingInventory,
    isErrorInventory,
  } = controller

  const { title, topToolbar, isCutLogPickerActive } = useInventoryHubChrome(controller)

  // Fetched callers (e.g. work-orders) may render before the inventory
  // detail query resolves. Show loading / error placeholders for view +
  // inventory-edit modes; cut-log edit mode does not depend on the
  // inventory snapshot (the row carries everything it needs) so it
  // renders normally even while the cells query is in flight.
  const needsInventory =
    mode.kind === "view" || mode.kind === "section-edit-inventory"
  const showLoadingPlaceholder = needsInventory && !inventory && isLoadingInventory
  const showErrorPlaceholder = needsInventory && !inventory && isErrorInventory

  return (
    <HubSidePanelShell open={isOpen} onClose={close} title={title} topToolbar={topToolbar}>
      {isCutLogPickerActive ? (
        <InventoryHubCutLogWorkOrderPicker controller={controller} />
      ) : showLoadingPlaceholder ? (
        <p className="px-1 text-sm text-[var(--foreground)]/65">Loading inventory…</p>
      ) : showErrorPlaceholder ? (
        <p className="px-1 text-sm text-rose-700">Could not load inventory.</p>
      ) : mode.kind === "view" ? (
        <div className="flex flex-col gap-5">
          <InventoryHubViewSection controller={controller} />
          <InventoryHubCutLogsListSection controller={controller} />
        </div>
      ) : mode.kind === "section-edit-inventory" ? (
        <InventoryHubInventoryEditSection controller={controller} />
      ) : mode.kind === "section-edit-cut-log" ? (
        <InventoryHubCutLogEditSection controller={controller} />
      ) : null}
    </HubSidePanelShell>
  )
}
