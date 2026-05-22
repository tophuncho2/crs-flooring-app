"use client"

import { useCallback, useMemo, useState } from "react"
import type { InventoryDetail } from "@builders/domain"
import {
  useCutLogEditPanel,
  type CutLogPanelPatch,
} from "@/modules/cut-logs"
import { useHubCutLogsQuery } from "./use-hub-cut-logs-query"
import { useHubInventoryEdit } from "./use-hub-inventory-edit"
import { useHubSectionTransitions } from "./use-hub-section-transitions"
import type { HubMode } from "./types"

export type UseInventoryHubSidePanelOptions = {
  /**
   * The inventory record that backs this hub. Caller (typically the
   * inventory record view) hands its latest snapshot in; the hub uses it
   * for the view-mode cells card and the inventory-edit hydration.
   * Mutations performed inside the hub call back via
   * `onInventoryUpdated` so the caller can reconcile its own state.
   */
  inventory: InventoryDetail
  warehouseName: string | null
  /**
   * Invalidate the cut-logs + balances caches after a cut-log mutation.
   * Shared with the inline `InventoryCutLogsSection` on the record view
   * so a save/finalize/void/delete refreshes both surfaces at once.
   */
  publishCutLogPatch: (patch: CutLogPanelPatch) => void
  /**
   * Fires after a successful hub-driven inventory save so the parent can
   * patch its own inventory snapshot.
   */
  onInventoryUpdated?: (inventory: InventoryDetail) => void
}

/**
 * Coordinator for the inventory hub side panel. Owns the mode state
 * machine and composes the inventory-edit slice + the embedded cut-log
 * edit panel controller + the paginated cut-logs query. Save / discard /
 * delete are dispatched here off `mode.kind`. Inventory edit saves pop
 * back to view; cut-log edit saves / finalize / void stay in place
 * (consistent with the standalone cut-log panel) so the operator can
 * see the result before navigating. Cut-log delete pops back to view
 * automatically because the embedded panel clears its open spec.
 *
 * Mirrors the property hub orchestrator pattern at
 * `apps/web/modules/properties/controllers/property-hub-side-panel/`.
 */
export function useInventoryHubSidePanel({
  inventory,
  warehouseName,
  publishCutLogPatch,
  onInventoryUpdated,
}: UseInventoryHubSidePanelOptions) {
  const [mode, setMode] = useState<HubMode>({ kind: "closed" })
  const [error, setError] = useState<string | null>(null)
  const clearError = useCallback(() => setError(null), [])
  const setErrorMessage = useCallback((message: string) => setError(message), [])

  // The embedded cut-log panel's mutations notify success via `publish`.
  // A `delete` patch means the row is gone and the embedded panel has
  // already cleared its open spec — pop back to view so the hub doesn't
  // sit on an empty cut-log edit body. Wrapped here (instead of via an
  // effect on `cutLogPanel.open`) so the transition happens in the same
  // render as the mutation success. The functional setMode update reads
  // the latest mode without a closure-captured snapshot.
  const publishWithModePop = useCallback(
    (patch: CutLogPanelPatch) => {
      publishCutLogPatch(patch)
      if (patch.kind === "delete") {
        setMode((current) =>
          current.kind === "section-edit-cut-log"
            ? { kind: "view", inventoryId: current.inventoryId }
            : current,
        )
        setError(null)
      }
    },
    [publishCutLogPatch],
  )

  const contextInventoryId: string | null = useMemo(() => {
    switch (mode.kind) {
      case "view":
      case "section-edit-inventory":
      case "section-edit-cut-log":
        return mode.inventoryId
      default:
        return null
    }
  }, [mode])

  const isInventoryEditActive = mode.kind === "section-edit-inventory"

  // ===== Embedded cut-log edit panel controller =====
  // Reuses the standalone panel's controller for all cut-log state +
  // mutations (form, baseline, dirty, save/finalize/void/delete). The hub
  // renders the fields inline inside the hub shell instead of mounting
  // the standalone shell. canCreate is false — cut-log creation stays
  // gated behind the work-orders record view per the existing contract.
  const cutLogPanel = useCutLogEditPanel({
    scope: { kind: "inventory", inventoryId: inventory.id },
    canCreate: false,
    publish: publishWithModePop,
  })

  // ===== Section-state slices =====
  const inventoryEdit = useHubInventoryEdit({
    isActive: isInventoryEditActive,
    inventory,
    clearError,
  })

  // ===== Paginated cut-logs list (view mode) =====
  const cutLogs = useHubCutLogsQuery(contextInventoryId)

  // ===== Combined save-busy across all slices =====
  const isSaving = inventoryEdit.isPending || cutLogPanel.isSaving

  const resetAll = useCallback(() => {
    inventoryEdit.reset()
    cutLogPanel.close()
    setError(null)
  }, [inventoryEdit, cutLogPanel])

  // ===== Mode-dispatched derivations =====
  const isDirty = useMemo(() => {
    if (mode.kind === "section-edit-inventory") return inventoryEdit.isDirty
    if (mode.kind === "section-edit-cut-log") return cutLogPanel.isDirty
    return false
  }, [mode.kind, inventoryEdit.isDirty, cutLogPanel.isDirty])

  const canSave = useMemo(() => {
    if (isSaving) return false
    if (mode.kind === "section-edit-inventory") {
      return inventoryEdit.isDirty && inventoryEdit.updatedAt !== null
    }
    if (mode.kind === "section-edit-cut-log") {
      // Defer the cut-log panel's own validity gating — its `save`
      // dispatcher already no-ops when invalid. We just need dirty + not
      // saving here so the button enabled state matches.
      return cutLogPanel.isDirty
    }
    return false
  }, [isSaving, mode.kind, inventoryEdit, cutLogPanel.isDirty])

  // ===== Openers =====
  const openForView = useCallback(() => {
    resetAll()
    setMode({ kind: "view", inventoryId: inventory.id })
  }, [inventory.id, resetAll])

  const close = useCallback(() => {
    if (isSaving) return
    setMode({ kind: "closed" })
    resetAll()
  }, [isSaving, resetAll])

  // ===== Section transitions =====
  const {
    enterInventoryEditFromContext,
    enterCutLogEditFromContext,
    exitToView,
  } = useHubSectionTransitions({
    contextInventoryId,
    inventory,
    setMode,
    setError,
    inventoryEdit,
    cutLogPanel,
    resetAll,
  })

  // ===== Save / Discard dispatch =====
  const save = useCallback(() => {
    if (mode.kind === "section-edit-inventory") {
      if (!canSave) return
      inventoryEdit.commitUpdate(mode.inventoryId, {
        onSuccess: (detail) => {
          setError(null)
          onInventoryUpdated?.(detail)
          setMode({ kind: "view", inventoryId: detail.id })
        },
        onError: setErrorMessage,
      })
      return
    }
    if (mode.kind === "section-edit-cut-log") {
      // Delegate to the embedded panel — it owns the cut-log mutation
      // dispatch. On success it stays open on the same row with refreshed
      // form/baseline; the hub leaves mode alone so the operator sees
      // the saved values before back-arrowing.
      cutLogPanel.save()
      return
    }
  }, [canSave, mode, inventoryEdit, cutLogPanel, onInventoryUpdated, setErrorMessage])

  const discard = useCallback(() => {
    if (isSaving) return
    if (mode.kind === "section-edit-inventory") inventoryEdit.resetToBaseline()
    else if (mode.kind === "section-edit-cut-log") cutLogPanel.discard()
    setError(null)
  }, [isSaving, mode.kind, inventoryEdit, cutLogPanel])

  const isOpen = mode.kind !== "closed"

  return {
    // ===== Modal state =====
    isOpen,
    mode,

    // ===== Openers =====
    openForView,
    close,

    // ===== Transitions =====
    enterInventoryEditFromContext,
    enterCutLogEditFromContext,
    exitToView,

    // ===== View-mode data =====
    inventory,
    warehouseName,
    cutLogs,

    // ===== Inventory-edit slice =====
    inventoryEdit,

    // ===== Embedded cut-log edit panel =====
    cutLogPanel,

    // ===== Combined controls =====
    isSaving,
    isDirty,
    canSave,
    error,
    save,
    discard,
  }
}

export type InventoryHubSidePanelController = ReturnType<typeof useInventoryHubSidePanel>
