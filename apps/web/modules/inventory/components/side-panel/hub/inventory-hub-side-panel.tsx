"use client"

import { HubSidePanelHubViewButton, HubSidePanelShell } from "@/components/hub-side-panel"
import type {
  HubMode,
  InventoryHubSidePanelController,
} from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryHubCutLogEditSection } from "./inventory-hub-cut-log-edit-section"
import { InventoryHubCutLogsListSection } from "./inventory-hub-cut-logs-list-section"
import { InventoryHubCutLogWorkOrderPicker } from "./inventory-hub-cut-log-work-order-picker"
import { InventoryHubInventoryEditSection } from "./inventory-hub-inventory-edit-section"
import { InventoryHubViewSection } from "./inventory-hub-view-section"
import { useInventoryHubChrome } from "./use-inventory-hub-chrome"

export type InventoryHubSidePanelProps = {
  controller: InventoryHubSidePanelController
  /**
   * "Back out" handler for the view-mode left chevron. The app-wide provider
   * passes a handler that closes the hub view and re-opens the inventory-hub
   * starting-spot cascade. Omit on the record-page instance (work orders),
   * where the chevron renders disabled.
   */
  onBackToStarting?: () => void
}

/**
 * Right-anchored inventory hub side panel. Mirrors the property hub
 * pattern at `modules/properties/components/side-panel/hub/`:
 *
 *   - view: read-only cells card on top, infinite-scroll cut-logs list below
 *   - section-edit-inventory: editable cells with archive / location /
 *           internalNotes mutations; roll# / dye lot / note stay
 *           UI-blocked
 *   - section-edit-cut-log: cut-log readonly summary + cut / notes /
 *           waste editable cells; toolbar exposes Save / Discard /
 *           Finalize / Void / Delete
 *   - picker-takeover: body swaps to a HubSidePanelPicker; the cut-log
 *           relink header stays sticky above via `useInventoryHubChrome`
 *
 * Per-mode chrome (title + topToolbar) lives in `useInventoryHubChrome`
 * — this file is the body dispatch + the title-row "Hub view" button.
 */
export function InventoryHubSidePanel({
  controller,
  onBackToStarting,
}: InventoryHubSidePanelProps) {
  const {
    isOpen,
    mode,
    viewTab,
    inventory,
    close,
    isLoadingInventory,
    isErrorInventory,
    exitToView,
  } = controller

  const { title, topToolbar, isCutLogPickerActive } = useInventoryHubChrome(controller, {
    onBackToStarting,
  })

  // "Hub view" lives in the title row, shown only in the section-edit modes
  // that have a parent hub view to pop back to (property-hub parity). Collapse
  // picker-takeover onto its returnTo so the button stays put while a picker
  // fills the body.
  const effectiveModeKind: HubMode["kind"] =
    mode.kind === "picker-takeover" ? mode.returnTo.kind : mode.kind
  const showHubViewButton =
    effectiveModeKind === "section-edit-inventory" ||
    effectiveModeKind === "section-edit-cut-log"

  // Fetched callers (e.g. work-orders) may render before the inventory
  // detail query resolves. Show loading / error placeholders only where the
  // inventory snapshot is actually required: the Inventory cells tab and
  // section-edit-inventory. The Cut Logs tab + cut-log edit don't depend on
  // the snapshot (the rows carry everything they need).
  const needsInventory =
    (mode.kind === "view" && viewTab === "inventory") ||
    mode.kind === "section-edit-inventory"
  const showLoadingPlaceholder = needsInventory && !inventory && isLoadingInventory
  const showErrorPlaceholder = needsInventory && !inventory && isErrorInventory

  return (
    <HubSidePanelShell
      open={isOpen}
      onClose={close}
      title={title}
      topToolbar={topToolbar}
      titleEnd={
        showHubViewButton ? (
          <HubSidePanelHubViewButton onClick={exitToView} />
        ) : null
      }
    >
      {isCutLogPickerActive ? (
        <InventoryHubCutLogWorkOrderPicker controller={controller} />
      ) : showLoadingPlaceholder ? (
        <p className="px-1 text-sm text-[var(--foreground)]/65">Loading inventory…</p>
      ) : showErrorPlaceholder ? (
        <p className="px-1 text-sm text-rose-700">Could not load inventory.</p>
      ) : mode.kind === "view" ? (
        viewTab === "cutLogs" ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              <InventoryHubCutLogsListSection controller={controller} />
            </div>
          </div>
        ) : (
          <InventoryHubViewSection controller={controller} />
        )
      ) : mode.kind === "section-edit-inventory" ? (
        <InventoryHubInventoryEditSection controller={controller} />
      ) : mode.kind === "section-edit-cut-log" ? (
        <InventoryHubCutLogEditSection controller={controller} />
      ) : null}
    </HubSidePanelShell>
  )
}
