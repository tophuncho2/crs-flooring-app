"use client"

import { useCallback, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { InventoryDetail } from "@builders/domain"
import {
  useAdjustmentEditPanel,
  EDIT_PICKER_CONFIG,
  type AdjustmentPanelPatch,
  type AdjustmentPanelRow,
} from "@/modules/adjustments"
import { INVENTORY_DETAIL_QUERY_KEY } from "@/modules/inventory/data/inventory-detail-request"
import { INVENTORY_ADJUSTMENTS_QUERY_KEY } from "@/modules/inventory/data/inventory-adjustments-request"
import { deriveCanSave, deriveIsDirty } from "./derive-hub-mode-flags"
import { toAdjustmentPanelRow } from "./to-adjustment-panel-row"
import { useHubAdjustmentsQuery } from "./use-hub-adjustments-query"
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
   * that only have an `inventoryId` (e.g. a adjustment panel in the
   * work-orders flow) omit this and the hub fetches on demand via
   * `useInventoryDetailQuery`.
   */
  initialInventory?: InventoryDetail | null
  /**
   * Invalidate the adjustments + balances caches after a adjustment mutation.
   * Record-view callers share their existing `publishAdjustmentPatch` so a
   * hub-driven adjustment mutation refreshes the inline adjustments section
   * too. Work-orders callers pass a no-op (or their WO snapshot updater).
   */
  publishAdjustmentPatch: (patch: AdjustmentPanelPatch) => void
  /**
   * Fires after a successful hub-driven inventory save. Record view uses
   * it to patch its own snapshot in place; other callers can omit it.
   */
  onInventoryUpdated?: (inventory: InventoryDetail) => void
}

/**
 * Coordinator for the inventory hub side panel. Owns the mode state
 * machine, the current `openId` (inventory under inspection), the
 * inventory-edit slice, the embedded adjustment edit panel controller, the
 * picker-takeover slice, and the paginated adjustments query.
 *
 * Two opening modes:
 *   - Seeded — caller passes `initialInventory` (record view). No fetch;
 *     the hub uses the live snapshot. `openForView()` / row clicks act on
 *     the seed's id.
 *   - Fetched — caller passes only `initialInventory: null` and opens
 *     via `openForView(inventoryId)` or `openForAdjustmentEdit(row)`. The
 *     hub fetches `InventoryDetail` from `GET /api/inventory/[id]` via
 *     `useInventoryDetailQuery`.
 *
 * Save / discard / delete dispatch off `mode.kind`. Inventory-edit saves
 * pop back to view; adjustment saves / finalize / void stay in place so the
 * operator sees the result before back-arrowing. Adjustment delete pops
 * back to view via the publish-callback wrapper.
 *
 * Mirrors `properties/.../property-hub-side-panel/`. The picker-takeover
 * mode + its slice are 1:1 with the property hub's pattern.
 */
export function useInventoryHubSidePanel({
  initialInventory,
  publishAdjustmentPatch,
  onInventoryUpdated,
}: UseInventoryHubSidePanelOptions) {
  const [mode, setMode] = useState<HubMode>({ kind: "closed" })
  // View-mode sub-tab: the cells card ("inventory") vs the adjustments list
  // ("adjustments"), flipped by the view switcher's chevrons. Adjustments live on
  // their own tab so the list gets the full panel body height (the stacked
  // layout starved it). Persists across a section-edit round-trip so backing
  // out of a adjustment edit returns to the Adjustments tab; resets on a fresh open.
  const [viewTab, setViewTab] = useState<"inventory" | "adjustments">("inventory")
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

  // The embedded adjustment panel's mutations notify success via `publish`.
  // A `delete` with `reason: "removed"` means the row is gone and the panel
  // has already cleared its open spec — pop back to view so the hub doesn't
  // sit on an empty adjustment edit body. A `reason: "relink-move"` delete is
  // only the bucket-move half of a relink (the WO-side snapshot cares; the
  // inv-side keeps the row since its `inventoryId` is unchanged), so it must
  // NOT pop — otherwise editing the work-order link bounces the user out of
  // the still-open panel. Also invalidate the inventory detail query so the
  // cells card reflects post-mutation totals when the hub is fetch-backed
  // (record-view callers already update via patchRecord; harmless there).
  const publishWithModePop = useCallback(
    (patch: AdjustmentPanelPatch) => {
      publishAdjustmentPatch(patch)
      if (openId !== null) invalidateInventoryDetail(openId)
      if (patch.kind === "delete" && patch.reason === "removed") {
        setMode((current) =>
          current.kind === "section-edit-adjustment"
            ? { kind: "view", inventoryId: current.inventoryId }
            : current,
        )
        setError(null)
      }
    },
    [publishAdjustmentPatch, openId, invalidateInventoryDetail],
  )

  const contextInventoryId: string | null = useMemo(() => {
    switch (mode.kind) {
      case "view":
      case "section-edit-inventory":
      case "section-duplicate-inventory":
      case "section-edit-adjustment":
      case "section-create-adjustment":
        return mode.inventoryId
      default:
        return null
    }
  }, [mode])

  const isInventoryEditActive = mode.kind === "section-edit-inventory"

  // After a manual adjustment is created, refresh the hub adjustments list so
  // the new row appears, then pop back to the Adjustments tab. The mutation
  // closes the panel's open spec; the hub owns the mode transition.
  const handleManualAdjustmentCreated = useCallback(() => {
    if (openId !== null) {
      void queryClient.invalidateQueries({
        queryKey: [...INVENTORY_ADJUSTMENTS_QUERY_KEY, openId],
      })
      setViewTab("adjustments")
      setMode({ kind: "view", inventoryId: openId })
    }
    setError(null)
  }, [openId, queryClient])

  // ===== Embedded adjustment edit panel controller =====
  // Reuses the standalone panel's controller for all adjustment state +
  // mutations. The hub renders the fields inline inside the hub shell
  // instead of mounting the standalone shell. canCreate is true — the
  // inventory hub hosts the manual (non-WO) INCREASE/DEDUCTION create flow;
  // WO-linked cuts are still created from the work-orders record view.
  const adjustmentPanel = useAdjustmentEditPanel({
    scope: { kind: "inventory", inventoryId: openId ?? "" },
    canCreate: true,
    publish: publishWithModePop,
    onCreated: handleManualAdjustmentCreated,
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

  // ===== Paginated adjustments list (view mode) =====
  const adjustments = useHubAdjustmentsQuery(contextInventoryId)

  // ===== Combined save-busy across all slices =====
  const isSaving =
    inventoryEdit.isPending || adjustmentPanel.isSaving || inventoryDuplicate.isPending

  const resetAll = useCallback(() => {
    inventoryEdit.reset()
    inventoryDuplicate.reset()
    adjustmentPanel.close()
    setError(null)
  }, [inventoryEdit, inventoryDuplicate, adjustmentPanel])

  // ===== Mode-dispatched derivations (pure fns in derive-hub-mode-flags) =====
  const isDirty = useMemo(
    () =>
      deriveIsDirty(
        mode.kind,
        inventoryEdit.isDirty,
        adjustmentPanel.isDirty,
        inventoryDuplicate.isDirty,
      ),
    [mode.kind, inventoryEdit.isDirty, adjustmentPanel.isDirty, inventoryDuplicate.isDirty],
  )

  const canSave = useMemo(
    () =>
      deriveCanSave(
        isSaving,
        mode.kind,
        inventoryEdit.isDirty,
        inventoryEdit.updatedAt,
        adjustmentPanel.isDirty,
        inventoryDuplicate.canSubmit,
      ),
    [
      isSaving,
      mode.kind,
      inventoryEdit.isDirty,
      inventoryEdit.updatedAt,
      adjustmentPanel.isDirty,
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
  const goToAdjustmentsView = useCallback(() => setViewTab("adjustments"), [])

  // External opener that lands directly in adjustment edit. Accepts the
  // broader `AdjustmentPanelRow` shape so both call sites can hand off
  // whatever row they have in scope: the inventory record view passes
  // `EnrichedInventoryAdjustmentRow` (server-resolved labels required), and the
  // work-orders side passes a `AdjustmentPanelRow` hydrated from in-scope
  // workOrder + WOMI state (since WO-side reads return plain InventoryAdjustmentRow).
  // Derives the parent inventoryId from the row.
  const openForAdjustmentEdit = useCallback(
    (row: AdjustmentPanelRow) => {
      resetAll()
      setOpenId(row.inventoryId)
      adjustmentPanel.openPanel({
        mode: "edit",
        pickerConfig: EDIT_PICKER_CONFIG,
        workOrderItemId: row.workOrderItemId,
        adjustment: toAdjustmentPanelRow(row),
      })
      setError(null)
      setMode({
        kind: "section-edit-adjustment",
        inventoryId: row.inventoryId,
        adjustmentId: row.id,
      })
    },
    [adjustmentPanel, resetAll],
  )

  const close = useCallback(() => {
    if (isSaving) return
    setMode({ kind: "closed" })
    resetAll()
  }, [isSaving, resetAll])

  // ===== Section transitions =====
  const {
    enterInventoryEditFromContext,
    enterAdjustmentEditFromContext,
    enterAdjustmentCreate,
    exitToView,
  } = useHubSectionTransitions({
    contextInventoryId,
    inventory,
    setMode,
    setError,
    inventoryEdit,
    inventoryDuplicate,
    adjustmentPanel,
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
    if (mode.kind === "section-edit-adjustment" || mode.kind === "section-create-adjustment") {
      adjustmentPanel.save()
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
    adjustmentPanel,
    onInventoryUpdated,
    invalidateInventoryDetail,
    openForView,
    setErrorMessage,
  ])

  const discard = useCallback(() => {
    if (isSaving) return
    if (mode.kind === "section-edit-inventory") inventoryEdit.resetToBaseline()
    else if (mode.kind === "section-duplicate-inventory") inventoryDuplicate.resetToSeed()
    else if (
      mode.kind === "section-edit-adjustment" ||
      mode.kind === "section-create-adjustment"
    )
      adjustmentPanel.discard()
    setError(null)
  }, [isSaving, mode.kind, inventoryEdit, inventoryDuplicate, adjustmentPanel])

  const isOpen = mode.kind !== "closed"

  return {
    // ===== Modal state =====
    isOpen,
    mode,
    viewTab,
    goToInventoryView,
    goToAdjustmentsView,

    // ===== Openers =====
    openForView,
    openForAdjustmentEdit,
    close,

    // ===== Transitions =====
    enterInventoryEditFromContext,
    enterAdjustmentEditFromContext,
    enterAdjustmentCreate,
    enterDuplicateFromView,
    exitToView,

    // ===== View-mode data =====
    inventory,
    warehouseName: inventory?.warehouseName ?? null,
    adjustments,
    isLoadingInventory,
    isErrorInventory,

    // ===== Inventory-edit slice =====
    inventoryEdit,

    // ===== Inventory-duplicate slice =====
    inventoryDuplicate,

    // ===== Embedded adjustment edit panel =====
    adjustmentPanel,

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
