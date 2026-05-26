"use client"

import { useCallback, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { InventoryDetail } from "@builders/domain"
import {
  useCutLogEditPanel,
  type CutLogPanelPatch,
  type CutLogPanelRow,
} from "@/modules/cut-logs"
import { INVENTORY_DETAIL_QUERY_KEY } from "@/modules/inventory/data/inventory-detail-request"
import { deriveCanSave, deriveIsDirty } from "./derive-hub-mode-flags"
import { toCutLogPanelRow } from "./to-cut-log-panel-row"
import { useCutLogPickerTakeover } from "./use-cut-log-picker-takeover"
import { useHubCutLogsQuery } from "./use-hub-cut-logs-query"
import { useHubInventoryDuplicate } from "./use-hub-inventory-duplicate"
import { useHubInventoryEdit } from "./use-hub-inventory-edit"
import { useHubSectionTransitions } from "./use-hub-section-transitions"
import { useInventoryDetailQuery } from "./use-inventory-detail-query"
import type { HubMode } from "./types"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"

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
 * inventory-edit slice, the embedded cut-log edit panel controller, the
 * picker-takeover slice, and the paginated cut-logs query.
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
 * Mirrors `properties/.../property-hub-side-panel/`. The picker-takeover
 * mode + its slice are 1:1 with the property hub's pattern.
 */
export function useInventoryHubSidePanel({
  initialInventory,
  publishCutLogPatch,
  onInventoryUpdated,
}: UseInventoryHubSidePanelOptions) {
  const [mode, setMode] = useState<HubMode>({ kind: "closed" })
  // View-mode sub-tab: the cells card ("inventory") vs the cut-logs list
  // ("cutLogs"), flipped by the view switcher's chevrons. Cut logs live on
  // their own tab so the list gets the full panel body height (the stacked
  // layout starved it). Persists across a section-edit round-trip so backing
  // out of a cut-log edit returns to the Cut Logs tab; resets on a fresh open.
  const [viewTab, setViewTab] = useState<"inventory" | "cutLogs">("inventory")
  const [error, setError] = useState<RecordSectionError | null>(null)
  const clearError = useCallback(() => setError(null), [])
  const setErrorMessage = useCallback(
    (err: unknown) =>
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to save inventory" })),
    [],
  )

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
        setMode((current) => {
          if (current.kind === "section-edit-cut-log") {
            return { kind: "view", inventoryId: current.inventoryId }
          }
          if (
            current.kind === "picker-takeover" &&
            current.returnTo.kind === "section-edit-cut-log"
          ) {
            return { kind: "view", inventoryId: current.returnTo.inventoryId }
          }
          return current
        })
        setError(null)
      }
    },
    [publishCutLogPatch, openId, invalidateInventoryDetail],
  )

  const contextInventoryId: string | null = useMemo(() => {
    switch (mode.kind) {
      case "view":
      case "section-edit-inventory":
      case "section-duplicate-inventory":
      case "section-edit-cut-log":
        return mode.inventoryId
      case "picker-takeover": {
        const r = mode.returnTo
        if (
          r.kind === "view" ||
          r.kind === "section-edit-inventory" ||
          r.kind === "section-duplicate-inventory" ||
          r.kind === "section-edit-cut-log"
        ) {
          return r.inventoryId
        }
        return null
      }
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

  // Duplicate-inventory section slice — owns its own draft + the
  // create-from-source mutation. Independent of the edit slice.
  const inventoryDuplicate = useHubInventoryDuplicate({ clearError })

  // ===== Cut-log picker takeover slice =====
  // Owns the picker-takeover mode transitions + commit handlers. Reads
  // `pickerKind` from the mode union (no orthogonal state).
  const cutLogPickerTakeover = useCutLogPickerTakeover({
    mode,
    setMode,
    cutLogPanel,
  })

  // ===== Paginated cut-logs list (view mode) =====
  const cutLogs = useHubCutLogsQuery(contextInventoryId)

  // ===== Combined save-busy across all slices =====
  const isSaving =
    inventoryEdit.isPending || cutLogPanel.isSaving || inventoryDuplicate.isPending

  const resetAll = useCallback(() => {
    inventoryEdit.reset()
    inventoryDuplicate.reset()
    cutLogPanel.close()
    setError(null)
  }, [inventoryEdit, inventoryDuplicate, cutLogPanel])

  // ===== Mode-dispatched derivations (pure fns in derive-hub-mode-flags) =====
  const isDirty = useMemo(
    () =>
      deriveIsDirty(
        mode.kind,
        inventoryEdit.isDirty,
        cutLogPanel.isDirty,
        inventoryDuplicate.isDirty,
      ),
    [mode.kind, inventoryEdit.isDirty, cutLogPanel.isDirty, inventoryDuplicate.isDirty],
  )

  const canSave = useMemo(
    () =>
      deriveCanSave(
        isSaving,
        mode.kind,
        inventoryEdit.isDirty,
        inventoryEdit.updatedAt,
        cutLogPanel.isDirty,
        inventoryDuplicate.canSubmit,
      ),
    [
      isSaving,
      mode.kind,
      inventoryEdit.isDirty,
      inventoryEdit.updatedAt,
      cutLogPanel.isDirty,
      inventoryDuplicate.canSubmit,
    ],
  )

  // ===== Openers =====
  // openForView accepts an optional inventoryId — fetched callers pass
  // it; seeded callers omit it and the hub falls back to the seed's id.
  const openForView = useCallback(
    (inventoryId?: string) => {
      const targetId = inventoryId ?? initialInventory?.id ?? null
      if (targetId === null) return
      resetAll()
      setOpenId(targetId)
      setViewTab("inventory")
      setMode({ kind: "view", inventoryId: targetId })
    },
    [initialInventory?.id, resetAll],
  )

  const goToInventoryView = useCallback(() => setViewTab("inventory"), [])
  const goToCutLogsView = useCallback(() => setViewTab("cutLogs"), [])

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
      setOpenId(row.inventoryId)
      cutLogPanel.openPanel({
        mode: "edit",
        workOrderItemId: row.workOrderItemId,
        cutLog: toCutLogPanelRow(row),
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
    inventoryDuplicate,
    cutLogPanel,
    resetAll,
  })

  // Enter the duplicate flow from view mode. The draft opens blank — nothing
  // is pre-filled from the source; the source stays visible via the red
  // "Reference inventory" card. `inventory` is still required so that card
  // (and the body's needs-inventory gate) has data.
  const enterDuplicateFromView = useCallback(() => {
    if (contextInventoryId === null || !inventory) return
    inventoryDuplicate.reset()
    setError(null)
    setMode({ kind: "section-duplicate-inventory", inventoryId: contextInventoryId })
  }, [contextInventoryId, inventory, inventoryDuplicate])

  // ===== Save / Discard dispatch =====
  const save = useCallback(() => {
    if (mode.kind === "section-edit-inventory") {
      if (!canSave) return
      inventoryEdit.commitUpdate(mode.inventoryId, {
        onSuccess: (detail) => {
          setError(null)
          onInventoryUpdated?.(detail)
          invalidateInventoryDetail(detail.id)
          // Stay open in section-edit-inventory; the slice already
          // applied the server snapshot to its form + baseline.
        },
        onError: setErrorMessage,
      })
      return
    }
    if (mode.kind === "section-edit-cut-log") {
      cutLogPanel.save()
      return
    }
    if (mode.kind === "section-duplicate-inventory") {
      if (!canSave) return
      inventoryDuplicate.commitDuplicate(mode.inventoryId, {
        onSuccess: (detail) => {
          setError(null)
          // Jump the hub to the brand-new row. openForView fetches it (the new
          // id never matches the seed). The list query is invalidated by the
          // mutation's onSuccess so the table picks up the new row too.
          openForView(detail.id)
        },
        onError: setErrorMessage,
      })
      return
    }
  }, [
    canSave,
    mode,
    inventoryEdit,
    inventoryDuplicate,
    cutLogPanel,
    onInventoryUpdated,
    invalidateInventoryDetail,
    openForView,
    setErrorMessage,
  ])

  const discard = useCallback(() => {
    if (isSaving) return
    if (mode.kind === "section-edit-inventory") inventoryEdit.resetToBaseline()
    else if (mode.kind === "section-duplicate-inventory") inventoryDuplicate.resetToSeed()
    else if (mode.kind === "section-edit-cut-log") cutLogPanel.discard()
    setError(null)
  }, [isSaving, mode.kind, inventoryEdit, inventoryDuplicate, cutLogPanel])

  const isOpen = mode.kind !== "closed"

  return {
    // ===== Modal state =====
    isOpen,
    mode,
    viewTab,
    goToInventoryView,
    goToCutLogsView,
    cutLogPickerKind: cutLogPickerTakeover.pickerKind,

    // ===== Openers =====
    openForView,
    openForCutLogEdit,
    close,

    // ===== Transitions =====
    enterInventoryEditFromContext,
    enterCutLogEditFromContext,
    enterDuplicateFromView,
    exitToView,

    // ===== Cut-log picker takeover =====
    openCutLogPicker: cutLogPickerTakeover.openPicker,
    closeCutLogPicker: cutLogPickerTakeover.closePicker,
    commitWorkOrderPick: cutLogPickerTakeover.commitWorkOrderPick,

    // ===== View-mode data =====
    inventory,
    warehouseName: inventory?.warehouseName ?? null,
    cutLogs,
    isLoadingInventory,
    isErrorInventory,

    // ===== Inventory-edit slice =====
    inventoryEdit,

    // ===== Inventory-duplicate slice =====
    inventoryDuplicate,

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
