"use client"

import { useCallback, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type {
  InventoryDetail,
  WorkOrderMaterialItemOption,
  WorkOrderOption,
} from "@builders/domain"
import {
  useCutLogEditPanel,
  type CutLogPanelPatch,
  type CutLogPanelRow,
} from "@/modules/cut-logs"
import { INVENTORY_DETAIL_QUERY_KEY } from "@/modules/inventory/data/inventory-detail-request"
import { useHubCutLogsQuery } from "./use-hub-cut-logs-query"
import { useHubInventoryEdit } from "./use-hub-inventory-edit"
import { useHubSectionTransitions } from "./use-hub-section-transitions"
import { useInventoryDetailQuery } from "./use-inventory-detail-query"
import type { HubMode } from "./types"

export type UseInventoryHubSidePanelOptions = {
  /**
   * Optional snapshot the caller already has in hand. The inventory
   * record view passes its live record here so the hub avoids a
   * round-trip and stays in sync with the parent page's edits. Callers
   * that only have an `inventoryId` (e.g. a cut-log panel in the
   * work-orders flow) omit this and the hub fetches on demand via
   * `useInventoryDetailQuery`.
   */
  initialInventory?: InventoryDetail | null
  /**
   * Invalidate the cut-logs + balances caches after a cut-log mutation.
   * Record-view callers share their existing `publishCutLogPatch` so a
   * hub-driven cut-log mutation refreshes the inline cut-logs section
   * too. Work-orders callers pass a no-op (or their WO snapshot updater).
   */
  publishCutLogPatch: (patch: CutLogPanelPatch) => void
  /**
   * Fires after a successful hub-driven inventory save. Record view uses
   * it to patch its own snapshot in place; other callers can omit it.
   */
  onInventoryUpdated?: (inventory: InventoryDetail) => void
}

/**
 * Coordinator for the inventory hub side panel. Owns the mode state
 * machine, the current `openId` (inventory under inspection), the
 * inventory-edit slice, the embedded cut-log edit panel controller, and
 * the paginated cut-logs query.
 *
 * Two opening modes:
 *   - Seeded — caller passes `initialInventory` (record view). No fetch;
 *     the hub uses the live snapshot. `openForView()` / row clicks act on
 *     the seed's id.
 *   - Fetched — caller passes only `initialInventory: null` and opens
 *     via `openForView(inventoryId)` or `openForCutLogEdit(row)`. The
 *     hub fetches `InventoryDetail` from `GET /api/inventory/[id]` via
 *     `useInventoryDetailQuery`.
 *
 * Save / discard / delete dispatch off `mode.kind`. Inventory-edit saves
 * pop back to view; cut-log saves / finalize / void stay in place so the
 * operator sees the result before back-arrowing. Cut-log delete pops
 * back to view via the publish-callback wrapper.
 *
 * Mirrors the property hub orchestrator pattern at
 * `apps/web/modules/properties/controllers/property-hub-side-panel/`.
 */
export type CutLogPickerKind = "workOrder" | "workOrderItem"

export function useInventoryHubSidePanel({
  initialInventory,
  publishCutLogPatch,
  onInventoryUpdated,
}: UseInventoryHubSidePanelOptions) {
  const [mode, setMode] = useState<HubMode>({ kind: "closed" })
  const [error, setError] = useState<string | null>(null)
  // Picker takeover state for the cut-log edit body. Orthogonal to `mode`:
  // when non-null while mode is section-edit-cut-log, the hub body renders
  // the picker takeover instead of the cut-log form. Mirrors the property
  // hub's `picker-takeover` mode but kept as a separate dimension so the
  // mode union stays minimal.
  const [cutLogPickerKind, setCutLogPickerKind] = useState<CutLogPickerKind | null>(null)
  const clearError = useCallback(() => setError(null), [])
  const setErrorMessage = useCallback((message: string) => setError(message), [])

  // Hub owns the current inventory-id state. Openers set this; it drives
  // the embedded panel's mutation scope + the cells query.
  const [openId, setOpenId] = useState<string | null>(
    initialInventory?.id ?? null,
  )

  // Fetch when we don't have a matching seed. The record-view caller
  // always seeds + only ever opens for the seed's id, so the query stays
  // disabled there. Work-orders callers don't seed, so it fires on every
  // opener.
  const needsFetch = openId !== null && initialInventory?.id !== openId
  const detailQuery = useInventoryDetailQuery(openId, { enabled: needsFetch })

  // Resolved live inventory snapshot. Seeded path wins for the record
  // view (lets caller reactively pass updated record). Fetched path uses
  // the query data.
  const inventory: InventoryDetail | null = needsFetch
    ? (detailQuery.data ?? null)
    : (initialInventory ?? null)

  const isLoadingInventory = needsFetch && detailQuery.isPending
  const isErrorInventory = needsFetch && detailQuery.isError

  const queryClient = useQueryClient()
  const invalidateInventoryDetail = useCallback(
    (id: string) => {
      void queryClient.invalidateQueries({
        queryKey: [...INVENTORY_DETAIL_QUERY_KEY, id],
      })
    },
    [queryClient],
  )

  // The embedded cut-log panel's mutations notify success via `publish`.
  // A `delete` patch means the row is gone and the embedded panel has
  // already cleared its open spec — pop back to view so the hub doesn't
  // sit on an empty cut-log edit body. Also invalidate the inventory
  // detail query so the cells card reflects post-mutation totals when
  // the hub is fetch-backed (record-view callers already update via
  // patchRecord; this is a harmless no-op on that path).
  const publishWithModePop = useCallback(
    (patch: CutLogPanelPatch) => {
      publishCutLogPatch(patch)
      if (openId !== null) invalidateInventoryDetail(openId)
      if (patch.kind === "delete") {
        setMode((current) =>
          current.kind === "section-edit-cut-log"
            ? { kind: "view", inventoryId: current.inventoryId }
            : current,
        )
        setError(null)
      }
    },
    [publishCutLogPatch, openId, invalidateInventoryDetail],
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
  // mutations. The hub renders the fields inline inside the hub shell
  // instead of mounting the standalone shell. canCreate is false —
  // cut-log creation stays gated behind the work-orders record view.
  const cutLogPanel = useCutLogEditPanel({
    scope: { kind: "inventory", inventoryId: openId ?? "" },
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
    setCutLogPickerKind(null)
    setError(null)
  }, [inventoryEdit, cutLogPanel])

  // ===== Cut-log picker takeover handlers =====
  // Triggers on the cut-log edit header (WO + WOMI relinks) fire these
  // to swap the body to the picker takeover. Commit handlers reuse the
  // cut-log panel controller's existing setters + snapshot helpers so
  // the form value + the picker trigger's label move together.
  //
  // `openCutLogPicker` toggles — clicking the active trigger closes the
  // picker (matches the template-sync top-toolbar pattern). The trigger
  // fires it unconditionally and the function decides open vs. close.
  const openCutLogPicker = useCallback((kind: CutLogPickerKind) => {
    setCutLogPickerKind((current) => (current === kind ? null : kind))
  }, [])

  const closeCutLogPicker = useCallback(() => {
    setCutLogPickerKind(null)
  }, [])

  const commitWorkOrderPick = useCallback(
    (option: WorkOrderOption | null) => {
      cutLogPanel.setWorkOrderId(option?.id ?? null)
      cutLogPanel.snapshotWorkOrderOption(option)
      setCutLogPickerKind(null)
    },
    [cutLogPanel],
  )

  const commitWorkOrderItemPick = useCallback(
    (option: WorkOrderMaterialItemOption | null) => {
      cutLogPanel.setWorkOrderItemId(option?.id ?? null)
      cutLogPanel.snapshotWorkOrderItemOption(option)
      setCutLogPickerKind(null)
    },
    [cutLogPanel],
  )

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
      return cutLogPanel.isDirty
    }
    return false
  }, [isSaving, mode.kind, inventoryEdit, cutLogPanel.isDirty])

  // ===== Openers =====
  // openForView accepts an optional inventoryId — fetched callers pass
  // it; seeded callers omit it and the hub falls back to the seed's id.
  const openForView = useCallback(
    (inventoryId?: string) => {
      const targetId = inventoryId ?? initialInventory?.id ?? null
      if (targetId === null) return
      resetAll()
      setOpenId(targetId)
      setMode({ kind: "view", inventoryId: targetId })
    },
    [initialInventory?.id, resetAll],
  )

  // External opener that lands directly in cut-log edit. Accepts the
  // broader `CutLogPanelRow` shape so both call sites can hand off
  // whatever row they have in scope: the inventory record view passes
  // `InventoryCutLogRow` (server-resolved labels required), and the
  // work-orders side passes a `CutLogPanelRow` hydrated from in-scope
  // workOrder + WOMI state (since WO-side reads return plain CutLogRow).
  // Derives the parent inventoryId from the row.
  const openForCutLogEdit = useCallback(
    (row: CutLogPanelRow) => {
      resetAll()
      const panelRow: CutLogPanelRow = {
        ...row,
        workOrderNumber: row.workOrderNumber ?? null,
        workOrderItemProductLabel: row.workOrderItemProductLabel ?? null,
        warehouseName: row.warehouseName ?? null,
      }
      setOpenId(row.inventoryId)
      cutLogPanel.openPanel({
        mode: "edit",
        workOrderItemId: row.workOrderItemId,
        cutLog: panelRow,
      })
      setError(null)
      setMode({
        kind: "section-edit-cut-log",
        inventoryId: row.inventoryId,
        cutLogId: row.id,
      })
    },
    [cutLogPanel, resetAll],
  )

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
          invalidateInventoryDetail(detail.id)
          setMode({ kind: "view", inventoryId: detail.id })
        },
        onError: setErrorMessage,
      })
      return
    }
    if (mode.kind === "section-edit-cut-log") {
      cutLogPanel.save()
      return
    }
  }, [
    canSave,
    mode,
    inventoryEdit,
    cutLogPanel,
    onInventoryUpdated,
    invalidateInventoryDetail,
    setErrorMessage,
  ])

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
    cutLogPickerKind,

    // ===== Openers =====
    openForView,
    openForCutLogEdit,
    close,

    // ===== Transitions =====
    enterInventoryEditFromContext,
    enterCutLogEditFromContext,
    exitToView,

    // ===== Cut-log picker takeover =====
    openCutLogPicker,
    closeCutLogPicker,
    commitWorkOrderPick,
    commitWorkOrderItemPick,

    // ===== View-mode data =====
    inventory,
    warehouseName: inventory?.warehouseName ?? null,
    cutLogs,
    isLoadingInventory,
    isErrorInventory,

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
