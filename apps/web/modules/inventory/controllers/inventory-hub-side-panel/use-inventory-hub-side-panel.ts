"use client"

import { useCallback, useMemo, useState } from "react"
import type { InventoryDetail } from "@builders/domain"
import { useSidePanelFreshness } from "@/engines/side-panel"
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

// Stable empty children list for the freshness config when nothing is open.
const EMPTY_CHILD_KEYS: ReadonlyArray<readonly unknown[]> = []

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

  // Engine-owned freshness for the open record. Registers the two queries this
  // panel renders — the inventory detail card + the in-hub adjustments list —
  // so every mutation and every flip refreshes both through one mechanism. This
  // is what closes the "finalize left the adjustments row stale" class of bug:
  // no individual mutation has to remember which keys to invalidate.
  const freshness = useSidePanelFreshness({
    detail: openId !== null ? [...INVENTORY_DETAIL_QUERY_KEY, openId] : null,
    children:
      openId !== null ? [[...INVENTORY_ADJUSTMENTS_QUERY_KEY, openId]] : EMPTY_CHILD_KEYS,
  })

  // The embedded adjustment panel's mutations notify success via `publish`.
  // EVERY patch refreshes the registered queries (detail card totals + the
  // in-hub adjustments list) via the engine, so finalize / update / void /
  // create all leave both surfaces live. A `delete` with `reason: "removed"`
  // additionally means the row is gone and the panel has cleared its open spec —
  // pop back to view so the hub doesn't sit on an empty adjustment edit body. A
  // `reason: "relink-move"` delete is only the bucket-move half of a relink (the
  // WO-side snapshot cares; the inv-side keeps the row since its `inventoryId` is
  // unchanged), so it must NOT pop.
  const publishWithModePop = useCallback(
    (patch: AdjustmentPanelPatch) => {
      publishAdjustmentPatch(patch)
      freshness.invalidateRegistered()
      if (patch.kind === "delete" && patch.reason === "removed") {
        setMode((current) =>
          current.kind === "section-edit-adjustment"
            ? { kind: "view", inventoryId: current.inventoryId }
            : current,
        )
        setError(null)
      }
    },
    [publishAdjustmentPatch, freshness],
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

  // ===== Embedded adjustment edit panel controller =====
  // Reuses the standalone panel's controller for all adjustment state +
  // mutations. The hub renders the fields inline inside the hub shell
  // instead of mounting the standalone shell. canCreate is true — the
  // inventory hub hosts the manual (non-WO) INCREASE/DEDUCTION create flow;
  // WO-linked cuts are still created from the work-orders record view.
  //
  // No `onCreated` override: after a create the panel flips to edit on the new
  // row (the mutation's default) and STAYS there — uniform with finalize /
  // update. The hub mode follows that flip via the reconciliation below. The
  // new row's freshness is handled by `publishWithModePop` (create publishes an
  // upsert, which invalidates the registered queries).
  const adjustmentPanel = useAdjustmentEditPanel({
    scope: { kind: "inventory", inventoryId: openId ?? "" },
    canCreate: true,
    publish: publishWithModePop,
  })

  // Follow the embedded panel's create→edit flip: when a hub create succeeds the
  // panel's open spec becomes `edit` while the hub is still in
  // `section-create-adjustment`. Align the hub mode so the body dispatch renders
  // the edit section on the now-created row. Conditional setState-during-render
  // (the condition is false after the flip, so it cannot loop) — mirrors the
  // panel's own `trackedOpen` reconciliation.
  if (
    mode.kind === "section-create-adjustment" &&
    adjustmentPanel.open?.mode === "edit"
  ) {
    setMode({
      kind: "section-edit-adjustment",
      inventoryId: mode.inventoryId,
      adjustmentId: adjustmentPanel.open.adjustment.id,
    })
  }

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

  // Flips refresh the surface being shown: the observer stays mounted across a
  // tab switch, so `refetchOnMount` never fires — invalidate explicitly so a
  // flip always reflects concurrent edits.
  const goToInventoryView = useCallback(() => {
    setViewTab("inventory")
    freshness.invalidateRegistered()
  }, [freshness])
  const goToAdjustmentsView = useCallback(() => {
    setViewTab("adjustments")
    freshness.invalidateRegistered()
  }, [freshness])

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
    // Drop the open id so a later reopen of the SAME record remounts the
    // detail + adjustments observers — `FRESH_ON_OPEN` then refetches, giving
    // fresh-on-open even in the app-wide shared mount (where the panel never
    // unmounts on its own). Seeded callers re-seed via `openForView()`.
    setOpenId(initialInventory?.id ?? null)
    resetAll()
  }, [isSaving, resetAll, initialInventory?.id])

  // ===== Section transitions =====
  const {
    enterInventoryEditFromContext,
    enterAdjustmentEditFromContext,
    enterAdjustmentCreate,
    exitToView: exitToViewBase,
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

  // Backing out of a section to the view list is a flip — refresh the registered
  // queries so the list + cells card reflect the edit just made (and any
  // concurrent edits) without a remount.
  const exitToView = useCallback(() => {
    exitToViewBase()
    freshness.invalidateRegistered()
  }, [exitToViewBase, freshness])

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
          freshness.invalidateRegistered()
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
    freshness,
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

    // ===== Engine freshness (refresh button) =====
    refreshAll: freshness.refreshAll,
    isRefreshing: freshness.isRefreshing,

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
