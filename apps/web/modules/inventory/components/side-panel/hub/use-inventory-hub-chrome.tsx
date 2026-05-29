"use client"

import { useMemo, type ReactNode } from "react"
import {
  HubSidePanelEditLayout,
  HubSidePanelEditToolbar,
  HubSidePanelViewSwitcher,
} from "@/components/hub-side-panel"
import { AdjustmentEditFinalizeButton } from "@/modules/adjustments/components/adjustment-edit-panel/toolbar-controls"
import type {
  HubMode,
  InventoryHubSidePanelController,
} from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryHubAdjustmentEditHeader } from "./inventory-hub-adjustment-edit-header"

export type InventoryHubChrome = {
  title: ReactNode
  topToolbar: ReactNode
  isAdjustmentPickerActive: boolean
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
 * (`InventoryHubAdjustmentEditHeader`, the toolbar primitives) so the
 * `InventoryHubSidePanel` component file stays focused on the body
 * render.
 *
 * `effectiveModeKind` collapses `picker-takeover` onto its `returnTo` so
 * the adjustment relink header stays sticky while a picker fills the body
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
    goToAdjustmentsView,
    adjustmentPickerKind,
    inventory,
    adjustmentPanel,
    isDirty,
    isSaving,
    canSave,
    error,
    save,
    discard,
  } = controller

  const isAdjustmentPickerActive = mode.kind === "picker-takeover"
  const effectiveModeKind: HubMode["kind"] =
    mode.kind === "picker-takeover" ? mode.returnTo.kind : mode.kind

  const adjustment =
    adjustmentPanel.open?.mode === "edit" ? adjustmentPanel.open.adjustment : null

  const title = useMemo<ReactNode>(() => {
    if (isAdjustmentPickerActive) {
      if (adjustmentPickerKind === "workOrder") return "Select work order"
    }
    switch (mode.kind) {
      case "section-edit-adjustment":
        return adjustment?.adjustmentNumber ?? "Adjustment"
      case "section-create-adjustment":
        return "New adjustment"
      case "section-edit-inventory":
      case "section-duplicate-inventory":
      case "view":
        return inventory?.inventoryItem || "Inventory"
      default:
        return "Inventory"
    }
  }, [
    mode.kind,
    adjustment,
    inventory?.inventoryItem,
    isAdjustmentPickerActive,
    adjustmentPickerKind,
  ])

  const adjustmentExtraLeftActions = useMemo<ReactNode>(() => {
    if (effectiveModeKind !== "section-edit-adjustment") return null
    // The toolbar's built-in SidePanelEditStatusPill already shows
    // dirty/saving; no second status pill here. Finalize is a
    // adjustment-domain action; it owns its own visibility (PENDING gate)
    // so the button renders or not based on status. It disables
    // alongside the rest of the toolbar during a picker takeover.
    return (
      <AdjustmentEditFinalizeButton
        controller={adjustmentPanel}
        mode="edit"
        disabled={isAdjustmentPickerActive}
      />
    )
  }, [effectiveModeKind, adjustmentPanel, isAdjustmentPickerActive])

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
    if (effectiveModeKind === "section-create-adjustment") {
      // Manual adjustment create — same toolbar, relabelled. No delete (nothing
      // exists yet); Discard resets the draft. Create errors surface on the
      // embedded panel, so fall back to its error.
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          saveLabel="Add adjustment"
          savingLabel="Adding…"
          errorMessage={error ?? adjustmentPanel.error ?? null}
        />
      )
    }
    if (effectiveModeKind === "section-edit-adjustment") {
      // The WO + WOMI relink header lives in the sticky topToolbar so
      // it stays visible while a picker takeover swaps the body below.
      // The actions toolbar stays mounted but disabled during a picker
      // takeover so the sticky header height (and the relink triggers'
      // positions) don't shift, while the user can't act mid-pick.
      const onDelete = adjustment ? adjustmentPanel.deleteAdjustment : undefined
      const isPending = adjustment?.status === "PENDING"
      const deleteDisabled = !isPending
      const deleteTitle =
        deleteDisabled && !adjustmentPanel.isSaving
          ? "Only pending adjustments can be deleted"
          : undefined
      const header = adjustment ? (
        <InventoryHubAdjustmentEditHeader
          adjustment={adjustment}
          adjustmentPanel={adjustmentPanel}
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
          extraLeftActions={adjustmentExtraLeftActions}
          errorMessage={error ?? adjustmentPanel.error ?? null}
          disabled={isAdjustmentPickerActive}
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
      // Two-tab view switcher: Inventory (cells) ⟷ Adjustments (list). On the
      // Inventory tab the left chevron pops back to the starting-spot cascade;
      // on the Adjustments tab it returns to the Inventory cells. Mirrors the
      // property hub's Properties ⟷ Templates switch.
      const isAdjustments = viewTab === "adjustments"
      return (
        <HubSidePanelViewSwitcher
          label={isAdjustments ? "Adjustments" : "Inventory"}
          prevDisabled={isAdjustments ? false : !onBackToStarting}
          nextDisabled={isAdjustments}
          onGoPrev={
            isAdjustments ? goToInventoryView : (onBackToStarting ?? (() => {}))
          }
          onGoNext={isAdjustments ? () => {} : goToAdjustmentsView}
          prevAriaLabel={isAdjustments ? "Show inventory" : "Back to inventory hub filters"}
          nextAriaLabel={isAdjustments ? "No further view" : "Show adjustments"}
        />
      )
    }
    return null
  }, [
    effectiveModeKind,
    viewTab,
    goToInventoryView,
    goToAdjustmentsView,
    isDirty,
    isSaving,
    canSave,
    save,
    discard,
    error,
    adjustment,
    adjustmentPanel,
    adjustmentExtraLeftActions,
    isAdjustmentPickerActive,
    controller,
    onBackToStarting,
  ])

  return { title, topToolbar, isAdjustmentPickerActive }
}
