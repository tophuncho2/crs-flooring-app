"use client"

import { useMemo, type ReactNode } from "react"
import {
  HubSidePanelEditLayout,
  HubSidePanelEditToolbar,
  HubSidePanelViewSwitcher,
} from "@/components/hub-side-panel"
import { CutLogEditFinalizeButton } from "@/modules/cut-logs/components/cut-log-edit-panel/toolbar-controls"
import type {
  HubMode,
  InventoryHubSidePanelController,
} from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryHubCutLogEditHeader } from "./inventory-hub-cut-log-edit-header"

export type InventoryHubChrome = {
  title: ReactNode
  topToolbar: ReactNode
  isCutLogPickerActive: boolean
}

export type UseInventoryHubChromeOptions = {
  /**
   * "Back out" handler for the view-mode left chevron. When provided (the
   * app-wide provider passes it), the chevron leaves the hub view and re-opens
   * the inventory-hub starting-spot cascade. Omit on surfaces with nowhere to
   * go back to (the work-orders record-page instance), where it renders
   * disabled — mirrors the property hub's `onBackToSync`.
   */
  onBackToStarting?: () => void
}

/**
 * Composes the inventory hub's sticky chrome — panel title + topToolbar
 * (the per-mode header / actions stack) — off the controller's current
 * mode. Lives next to the component files that the chrome composes
 * (`InventoryHubCutLogEditHeader`, the toolbar primitives) so the
 * `InventoryHubSidePanel` component file stays focused on the body
 * render.
 *
 * `effectiveModeKind` collapses `picker-takeover` onto its `returnTo` so
 * the cut-log relink header stays sticky while a picker fills the body
 * below (template-sync pattern, preserved from commit a8d5d31a).
 *
 * The "Hub view" back button no longer lives in the edit toolbars — it moved
 * to the shell `titleEnd` (property-hub parity). View mode renders a
 * `HubSidePanelViewSwitcher` whose left chevron returns to the starting spot.
 */
export function useInventoryHubChrome(
  controller: InventoryHubSidePanelController,
  options: UseInventoryHubChromeOptions = {},
): InventoryHubChrome {
  const { onBackToStarting } = options
  const {
    mode,
    viewTab,
    goToInventoryView,
    goToCutLogsView,
    cutLogPickerKind,
    inventory,
    cutLogPanel,
    isDirty,
    isSaving,
    canSave,
    error,
    save,
    discard,
  } = controller

  const isCutLogPickerActive = mode.kind === "picker-takeover"
  const effectiveModeKind: HubMode["kind"] =
    mode.kind === "picker-takeover" ? mode.returnTo.kind : mode.kind

  const cutLog =
    cutLogPanel.open?.mode === "edit" ? cutLogPanel.open.cutLog : null

  const title = useMemo<ReactNode>(() => {
    if (isCutLogPickerActive) {
      if (cutLogPickerKind === "workOrder") return "Select work order"
    }
    switch (mode.kind) {
      case "section-edit-cut-log":
        return cutLog?.adjustmentNumber ?? "Cut log"
      case "section-edit-inventory":
      case "section-duplicate-inventory":
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
    if (effectiveModeKind !== "section-edit-cut-log") return null
    // The toolbar's built-in SidePanelEditStatusPill already shows
    // dirty/saving; no second status pill here. Finalize is a
    // cut-log-domain action; it owns its own visibility (PENDING gate)
    // so the button renders or not based on status. It disables
    // alongside the rest of the toolbar during a picker takeover.
    return (
      <CutLogEditFinalizeButton
        controller={cutLogPanel}
        mode="edit"
        disabled={isCutLogPickerActive}
      />
    )
  }, [effectiveModeKind, cutLogPanel, isCutLogPickerActive])

  const topToolbar = useMemo<ReactNode>(() => {
    if (effectiveModeKind === "section-edit-inventory") {
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          errorMessage={error}
        />
      )
    }
    if (effectiveModeKind === "section-duplicate-inventory") {
      // Create flow — same toolbar, relabelled. No delete button (nothing
      // exists yet); Discard resets the draft to the seeded values.
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          saveLabel="Create duplicate"
          savingLabel="Creating…"
          errorMessage={error}
        />
      )
    }
    if (effectiveModeKind === "section-edit-cut-log") {
      // The WO + WOMI relink header lives in the sticky topToolbar so
      // it stays visible while a picker takeover swaps the body below.
      // The actions toolbar stays mounted but disabled during a picker
      // takeover so the sticky header height (and the relink triggers'
      // positions) don't shift, while the user can't act mid-pick.
      const onDelete = cutLog ? cutLogPanel.deleteCutLog : undefined
      const isPending = cutLog?.status === "PENDING"
      const deleteDisabled = !isPending
      const deleteTitle =
        deleteDisabled && !cutLogPanel.isSaving
          ? "Only pending cut logs can be deleted"
          : undefined
      const header = cutLog ? (
        <InventoryHubCutLogEditHeader
          cutLog={cutLog}
          cutLogPanel={cutLogPanel}
          hubController={controller}
        />
      ) : null
      const actions = (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          onDelete={onDelete}
          deleteDisabled={deleteDisabled}
          deleteTitle={deleteTitle}
          extraLeftActions={cutLogExtraLeftActions}
          errorMessage={error ?? cutLogPanel.error ?? null}
          disabled={isCutLogPickerActive}
        />
      )
      if (!header && !actions) return null
      return (
        <HubSidePanelEditLayout toolbar={actions}>
          {header}
        </HubSidePanelEditLayout>
      )
    }
    if (effectiveModeKind === "view") {
      // Two-tab view switcher: Inventory (cells) ⟷ Cut Logs (list). On the
      // Inventory tab the left chevron pops back to the starting-spot cascade;
      // on the Cut Logs tab it returns to the Inventory cells. Mirrors the
      // property hub's Properties ⟷ Templates switch.
      const isCutLogs = viewTab === "cutLogs"
      return (
        <HubSidePanelViewSwitcher
          label={isCutLogs ? "Cut Logs" : "Inventory"}
          prevDisabled={isCutLogs ? false : !onBackToStarting}
          nextDisabled={isCutLogs}
          onGoPrev={
            isCutLogs ? goToInventoryView : (onBackToStarting ?? (() => {}))
          }
          onGoNext={isCutLogs ? () => {} : goToCutLogsView}
          prevAriaLabel={isCutLogs ? "Show inventory" : "Back to inventory hub filters"}
          nextAriaLabel={isCutLogs ? "No further view" : "Show cut logs"}
        />
      )
    }
    return null
  }, [
    effectiveModeKind,
    viewTab,
    goToInventoryView,
    goToCutLogsView,
    isDirty,
    isSaving,
    canSave,
    save,
    discard,
    error,
    cutLog,
    cutLogPanel,
    cutLogExtraLeftActions,
    isCutLogPickerActive,
    controller,
    onBackToStarting,
  ])

  return { title, topToolbar, isCutLogPickerActive }
}
