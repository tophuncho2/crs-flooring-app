"use client"

import { useMemo, type ReactNode } from "react"
import {
  HubSidePanelEditLayout,
  HubSidePanelEditToolbar,
  HubSidePanelPagination,
} from "@/components/hub-side-panel"
import {
  CutLogEditFinalizeButton,
  CutLogEditVoidButton,
} from "@/modules/cut-logs/components/cut-log-edit-panel/toolbar-controls"
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
 */
export function useInventoryHubChrome(
  controller: InventoryHubSidePanelController,
): InventoryHubChrome {
  const {
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
    exitToView,
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
    if (effectiveModeKind !== "section-edit-cut-log") return null
    // The toolbar's built-in SidePanelEditStatusPill already shows
    // dirty/saving; no second status pill here. Finalize + Void are
    // cut-log-domain actions; they own their own visibility (PENDING /
    // FINAL gates) so the buttons render or not based on status. They
    // disable alongside the rest of the toolbar during a picker takeover.
    return (
      <>
        <CutLogEditFinalizeButton
          controller={cutLogPanel}
          mode="edit"
          disabled={isCutLogPickerActive}
        />
        <CutLogEditVoidButton
          controller={cutLogPanel}
          mode="edit"
          disabled={isCutLogPickerActive}
        />
      </>
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
          onOpenHubView={exitToView}
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
          onOpenHubView={exitToView}
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
    effectiveModeKind,
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
    controller,
  ])

  return { title, topToolbar, isCutLogPickerActive }
}
