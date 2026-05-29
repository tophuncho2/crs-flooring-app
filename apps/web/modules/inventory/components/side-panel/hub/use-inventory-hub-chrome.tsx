"use client"

import { useCallback, useMemo, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  HubSidePanelEditLayout,
  HubSidePanelEditToolbar,
  HubSidePanelViewSwitcher,
} from "@/components/hub-side-panel"
import { AdjustmentEditFinalizeButton } from "@/modules/adjustments/components/adjustment-edit-panel/toolbar-controls"
import { AdjustmentPickerStack } from "@/modules/adjustments"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

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
 * Composes the inventory hub's sticky chrome — panel title + topToolbar — off
 * the controller's current mode. The adjustment create/edit modes render the
 * shared `AdjustmentPickerStack` in the sticky header; a body-takeover picker
 * is active whenever the embedded adjustment controller's `pickerKind` is set,
 * so the chrome reads that (no separate hub picker mode).
 */
export function useInventoryHubChrome(
  controller: InventoryHubSidePanelController,
  options: UseInventoryHubChromeOptions = {},
): InventoryHubChrome {
  const { onBackToStarting } = options
  const router = useRouter()
  const {
    mode,
    viewTab,
    goToInventoryView,
    goToAdjustmentsView,
    inventory,
    adjustmentPanel,
    isDirty,
    isSaving,
    canSave,
    error,
    save,
    discard,
  } = controller

  const isAdjustmentPickerActive = adjustmentPanel.pickerKind !== null

  const adjustment =
    adjustmentPanel.open?.mode === "edit" ? adjustmentPanel.open.adjustment : null

  const title = useMemo<ReactNode>(() => {
    const pk = adjustmentPanel.pickerKind
    if (pk === "warehouse") return "Select warehouse"
    if (pk === "inventory") return "Select inventory"
    if (pk === "location") return "Select location"
    if (pk === "workOrder") return "Select work order"
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
  }, [mode.kind, adjustment, inventory?.inventoryItem, adjustmentPanel.pickerKind])

  const adjustmentExtraLeftActions = useMemo<ReactNode>(() => {
    if (mode.kind !== "section-edit-adjustment") return null
    return (
      <AdjustmentEditFinalizeButton
        controller={adjustmentPanel}
        mode="edit"
        disabled={isAdjustmentPickerActive}
      />
    )
  }, [mode.kind, adjustmentPanel, isAdjustmentPickerActive])

  const onOpenWorkOrder = useCallback(
    (id: string) => router.push(`/dashboard/work-orders/${id}`),
    [router],
  )

  const topToolbar = useMemo<ReactNode>(() => {
    if (mode.kind === "section-edit-inventory") {
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
    if (mode.kind === "section-duplicate-inventory") {
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
    if (mode.kind === "section-create-adjustment" || mode.kind === "section-edit-adjustment") {
      // Both adjustment modes share the picker stack in the sticky header; only
      // the toolbar labels + edit-only actions (delete / finalize) differ. The
      // toolbar stays mounted but disabled during a picker takeover so the
      // header height + trigger positions don't shift.
      const isEdit = mode.kind === "section-edit-adjustment"
      const isPending = adjustment?.status === "PENDING"
      const actions = (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          saveLabel={isEdit ? undefined : "Add adjustment"}
          savingLabel={isEdit ? undefined : "Adding…"}
          onDelete={isEdit && adjustment ? adjustmentPanel.deleteAdjustment : undefined}
          deleteDisabled={isEdit ? !isPending : undefined}
          deleteTitle={
            isEdit && !isPending && !adjustmentPanel.isSaving
              ? "Only pending adjustments can be deleted"
              : undefined
          }
          extraLeftActions={isEdit ? adjustmentExtraLeftActions : undefined}
          errorMessage={error ?? adjustmentPanel.error ?? null}
          disabled={isAdjustmentPickerActive}
        />
      )
      return (
        <HubSidePanelEditLayout toolbar={actions}>
          <AdjustmentPickerStack controller={adjustmentPanel} onOpenWorkOrder={onOpenWorkOrder} />
        </HubSidePanelEditLayout>
      )
    }
    if (mode.kind === "view") {
      const isAdjustments = viewTab === "adjustments"
      return (
        <HubSidePanelViewSwitcher
          label={isAdjustments ? "Adjustments" : "Inventory"}
          prevDisabled={isAdjustments ? false : !onBackToStarting}
          nextDisabled={isAdjustments}
          onGoPrev={isAdjustments ? goToInventoryView : (onBackToStarting ?? (() => {}))}
          onGoNext={isAdjustments ? () => {} : goToAdjustmentsView}
          prevAriaLabel={isAdjustments ? "Show inventory" : "Back to inventory hub filters"}
          nextAriaLabel={isAdjustments ? "No further view" : "Show adjustments"}
        />
      )
    }
    return null
  }, [
    mode.kind,
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
    onBackToStarting,
    onOpenWorkOrder,
  ])

  return { title, topToolbar, isAdjustmentPickerActive }
}
