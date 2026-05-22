"use client"

import { useMemo, type ReactNode } from "react"
import {
  HubSidePanelEditToolbar,
  HubSidePanelPagination,
  HubSidePanelShell,
} from "@/components/hub-side-panel"
import {
  CutLogEditFinalizeButton,
  CutLogEditVoidButton,
} from "@/modules/cut-logs/components/cut-log-edit-panel/toolbar-controls"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryHubCutLogEditSection } from "./inventory-hub-cut-log-edit-section"
import { InventoryHubCutLogsListSection } from "./inventory-hub-cut-logs-list-section"
import { InventoryHubCutLogWorkOrderItemPicker } from "./inventory-hub-cut-log-work-order-item-picker"
import { InventoryHubCutLogWorkOrderPicker } from "./inventory-hub-cut-log-work-order-picker"
import { InventoryHubInventoryEditSection } from "./inventory-hub-inventory-edit-section"
import { InventoryHubViewSection } from "./inventory-hub-view-section"

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
 *
 * Cut-log status transitions (Finalize / Void) live in the toolbar's
 * extra-left-actions slot so they read as section-scoped actions
 * alongside the back-arrow rather than mixing into Save / Discard /
 * Delete.
 */
export function InventoryHubSidePanel({ controller }: InventoryHubSidePanelProps) {
  const {
    isOpen,
    mode,
    cutLogPickerKind,
    inventory,
    cutLogs,
    cutLogPanel,
    isDirty,
    isSaving,
    canSave,
    error,
    save,
    discard,
    close,
    exitToView,
    isLoadingInventory,
    isErrorInventory,
  } = controller

  const isCutLogPickerActive =
    mode.kind === "section-edit-cut-log" && cutLogPickerKind !== null

  const cutLog =
    cutLogPanel.open?.mode === "edit" ? cutLogPanel.open.cutLog : null

  const title = useMemo<ReactNode>(() => {
    if (isCutLogPickerActive) {
      if (cutLogPickerKind === "workOrder") return "Select work order"
      if (cutLogPickerKind === "workOrderItem") return "Select material item"
    }
    switch (mode.kind) {
      case "section-edit-cut-log":
        return cutLog?.cutLogNumber ?? "Cut log"
      case "section-edit-inventory":
      case "view":
        return inventory?.inventoryItem || "Inventory"
      default:
        return "Inventory"
    }
  }, [
    mode.kind,
    cutLog,
    inventory?.inventoryItem,
    isCutLogPickerActive,
    cutLogPickerKind,
  ])

  const cutLogExtraLeftActions = useMemo<ReactNode>(() => {
    if (mode.kind !== "section-edit-cut-log") return null
    // The toolbar's built-in SidePanelEditStatusPill already shows
    // dirty/saving; no second status pill here. Finalize + Void are
    // cut-log-domain actions; they own their own visibility (PENDING /
    // FINAL gates) so the buttons render or not based on status.
    return (
      <>
        <CutLogEditFinalizeButton controller={cutLogPanel} mode="edit" />
        <CutLogEditVoidButton controller={cutLogPanel} mode="edit" />
      </>
    )
  }, [mode.kind, cutLogPanel])

  const topToolbar = useMemo<ReactNode>(() => {
    // Picker takeover replaces the toolbar with a minimal placeholder
    // so the panel chrome doesn't jump while the body holds the picker.
    // The picker body owns Escape / clear / cancel; selection commits
    // via the controller's commit handlers.
    if (isCutLogPickerActive) return null
    if (mode.kind === "section-edit-inventory") {
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          onOpenHubView={exitToView}
          errorMessage={error}
        />
      )
    }
    if (mode.kind === "section-edit-cut-log") {
      // Cut-log save/discard are routed through the hub coordinator so
      // the section-busy + dirty derivations stay coherent. Delete +
      // finalize + void are wired straight to the embedded panel —
      // they're domain-specific cut-log actions with their own
      // visibility rules. Finalize / Void render conditionally inside
      // `cutLogExtraLeftActions` based on status. Delete stays visible
      // for every edit row but is HTML-disabled unless the row is
      // PENDING — matches the standalone panel's `CutLogEditDeleteButton`
      // contract and the server gate (FINAL / VOID rows must be reversed
      // before deletion).
      const onDelete = cutLog ? cutLogPanel.deleteCutLog : undefined
      const isPending = cutLog?.status === "PENDING"
      const deleteDisabled = !isPending
      const deleteTitle =
        deleteDisabled && !cutLogPanel.isSaving
          ? "Only pending cut logs can be deleted"
          : undefined
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          onDelete={onDelete}
          deleteDisabled={deleteDisabled}
          deleteTitle={deleteTitle}
          onOpenHubView={exitToView}
          extraLeftActions={cutLogExtraLeftActions}
          errorMessage={error ?? cutLogPanel.error ?? null}
        />
      )
    }
    if (mode.kind === "view") {
      const showPagination = cutLogs.hasData && cutLogs.total > cutLogs.pageSize
      if (!showPagination) return null
      return (
        <HubSidePanelPagination
          page={cutLogs.page}
          totalPages={cutLogs.totalPages}
          total={cutLogs.total}
          totalLabel="cut logs"
          canPrev={cutLogs.canPrev}
          canNext={cutLogs.canNext}
          onGoPrev={cutLogs.goPrev}
          onGoNext={cutLogs.goNext}
        />
      )
    }
    return null
  }, [
    mode.kind,
    isDirty,
    isSaving,
    canSave,
    save,
    discard,
    exitToView,
    error,
    cutLog,
    cutLogPanel,
    cutLogExtraLeftActions,
    cutLogs,
    isCutLogPickerActive,
  ])

  // Fetched callers (e.g. work-orders) may render before the inventory
  // detail query resolves. Show loading / error placeholders for view +
  // inventory-edit modes; the cut-log edit mode does not depend on the
  // inventory snapshot (the row carries everything it needs) so it
  // renders normally even while the cells query is in flight.
  const needsInventory =
    mode.kind === "view" || mode.kind === "section-edit-inventory"
  const showLoadingPlaceholder = needsInventory && !inventory && isLoadingInventory
  const showErrorPlaceholder = needsInventory && !inventory && isErrorInventory

  return (
    <HubSidePanelShell open={isOpen} onClose={close} title={title} topToolbar={topToolbar}>
      {isCutLogPickerActive ? (
        cutLogPickerKind === "workOrder" ? (
          <InventoryHubCutLogWorkOrderPicker controller={controller} />
        ) : cutLogPickerKind === "workOrderItem" ? (
          <InventoryHubCutLogWorkOrderItemPicker controller={controller} />
        ) : null
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
