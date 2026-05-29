"use client"

import {
  HubSidePanelAddButton,
  HubSidePanelDuplicateButton,
  HubSidePanelHubViewButton,
  HubSidePanelShell,
} from "@/components/hub-side-panel"
import type {
  HubMode,
  InventoryHubSidePanelController,
} from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryHubAdjustmentCreateSection } from "./inventory-hub-adjustment-create-section"
import { InventoryHubAdjustmentEditSection } from "./inventory-hub-adjustment-edit-section"
import { InventoryHubAdjustmentsListSection } from "./inventory-hub-adjustments-list-section"
import { InventoryHubAdjustmentWorkOrderPicker } from "./inventory-hub-adjustment-work-order-picker"
import { InventoryHubInventoryDuplicateSection } from "./inventory-hub-inventory-duplicate-section"
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
 *   - view: read-only cells card on top, infinite-scroll adjustments list below
 *   - section-edit-inventory: editable cells with archive / location /
 *           internalNotes mutations; roll# / dye lot / note stay
 *           UI-blocked
 *   - section-edit-adjustment: adjustment readonly summary + cut / notes /
 *           waste editable cells; toolbar exposes Save / Discard /
 *           Finalize / Void / Delete
 *   - picker-takeover: body swaps to a HubSidePanelPicker; the adjustment
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
    enterDuplicateFromView,
    enterAdjustmentCreate,
    isSaving,
  } = controller

  const { title, topToolbar, isAdjustmentPickerActive } = useInventoryHubChrome(controller, {
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
    effectiveModeKind === "section-duplicate-inventory" ||
    effectiveModeKind === "section-edit-adjustment"

  // "Duplicate inventory item" sits in the title row next to the close (X),
  // shown only in view mode once a row is loaded. Clicking it seeds the
  // duplicate draft and swaps to section-duplicate-inventory.
  const showDuplicateButton = mode.kind === "view" && inventory !== null

  // "Add adjustment" sits in the title row too, shown in view mode once a row
  // is loaded. Opens the manual (non-WO) INCREASE/DEDUCTION create form.
  const showAddAdjustmentButton = mode.kind === "view" && inventory !== null

  // Fetched callers (e.g. work-orders) may render before the inventory
  // detail query resolves. Show loading / error placeholders only where the
  // inventory snapshot is actually required: the Inventory cells tab and
  // section-edit-inventory. The Adjustments tab + adjustment edit don't depend on
  // the snapshot (the rows carry everything they need).
  const needsInventory =
    (mode.kind === "view" && viewTab === "inventory") ||
    mode.kind === "section-edit-inventory" ||
    mode.kind === "section-duplicate-inventory"
  const showLoadingPlaceholder = needsInventory && !inventory && isLoadingInventory
  const showErrorPlaceholder = needsInventory && !inventory && isErrorInventory

  return (
    <HubSidePanelShell
      open={isOpen}
      onClose={close}
      title={title}
      topToolbar={topToolbar}
      titleEnd={
        <>
          {showHubViewButton ? <HubSidePanelHubViewButton onClick={exitToView} /> : null}
          {showAddAdjustmentButton ? (
            <HubSidePanelAddButton
              onClick={enterAdjustmentCreate}
              disabled={isSaving}
              label="+ Adjustment"
            />
          ) : null}
          {showDuplicateButton ? (
            <HubSidePanelDuplicateButton
              onClick={enterDuplicateFromView}
              disabled={isSaving}
              ariaLabel="Duplicate inventory item"
            />
          ) : null}
        </>
      }
    >
      {isAdjustmentPickerActive ? (
        <InventoryHubAdjustmentWorkOrderPicker controller={controller} />
      ) : showLoadingPlaceholder ? (
        <p className="px-1 text-sm text-[var(--foreground)]/65">Loading inventory…</p>
      ) : showErrorPlaceholder ? (
        <p className="px-1 text-sm text-rose-700">Could not load inventory.</p>
      ) : mode.kind === "view" ? (
        viewTab === "adjustments" ? (
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1">
              <InventoryHubAdjustmentsListSection controller={controller} />
            </div>
          </div>
        ) : (
          <InventoryHubViewSection controller={controller} />
        )
      ) : mode.kind === "section-edit-inventory" ? (
        <InventoryHubInventoryEditSection controller={controller} />
      ) : mode.kind === "section-duplicate-inventory" ? (
        <InventoryHubInventoryDuplicateSection controller={controller} />
      ) : mode.kind === "section-edit-adjustment" ? (
        <InventoryHubAdjustmentEditSection controller={controller} />
      ) : mode.kind === "section-create-adjustment" ? (
        <InventoryHubAdjustmentCreateSection controller={controller} />
      ) : null}
    </HubSidePanelShell>
  )
}
