"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { InventoryOption } from "@builders/domain"
import type { CutLogScopeUrl } from "@/modules/cut-logs/data/mutations"
import {
  EMPTY_FORM,
  EMPTY_LOCAL,
  buildEditForm,
  formIsDirty,
  isCreateValid,
  isEditValid,
} from "./form"
import {
  useCreateCutLogMutation,
  useDeleteCutLogMutation,
  useFinalizeCutLogMutation,
  useUpdateCutLogMutation,
  useVoidCutLogMutation,
} from "./mutations"
import type {
  CutLogEditForm,
  CutLogEditPanelOpenSpec,
  CutLogPanelLocal,
  CutLogPanelPatch,
} from "./types"

/**
 * Owns the side-panel lifecycle for cut-log editing: open/close, current
 * row, editable form, dirty tracking, free-text location filter for create
 * mode, and composes all five cut-log mutation hooks (create / update /
 * delete / void / finalize).
 *
 * Scope-aware: `scope` drives the request URLs. WO callers pass
 * `{ kind: "work-order", workOrderId }`; inv callers pass
 * `{ kind: "inventory", inventoryId }`. `canCreate` gates whether the
 * create flow is reachable — WO callers pass true (with `warehouseId`
 * for the inventory picker); inv callers pass false (cut logs are only
 * created from WOMI rows in the UI).
 *
 * Mutation success → `publish(patch)` so the parent updates its snapshot.
 * Behavior contract:
 *   - Save (create) → stay open, transition to edit on the new row
 *   - Save (edit)   → stay open, refresh form to server values
 *   - Finalize      → stay open on the now-FINAL row (input cells go
 *                     read-only via `isCutLogPendingEditable`)
 *   - Void          → stay open on the now-VOID row (input cells go
 *                     read-only)
 *   - Delete        → close (row no longer exists)
 *   - Backdrop / ESC / X → close, discard unsaved
 */
export function useCutLogEditPanel({
  scope,
  warehouseId,
  canCreate,
  publish,
}: {
  scope: CutLogScopeUrl
  /** Required when `canCreate` is true — drives the inventory picker. */
  warehouseId?: string | null
  canCreate: boolean
  publish: (patch: CutLogPanelPatch) => void
}) {
  const [open, setOpen] = useState<CutLogEditPanelOpenSpec | null>(null)
  const [form, setForm] = useState<CutLogEditForm>(EMPTY_FORM)
  const [baseline, setBaseline] = useState<CutLogEditForm>(EMPTY_FORM)
  const [local, setLocal] = useState<CutLogPanelLocal>(EMPTY_LOCAL)
  const [error, setError] = useState<string | null>(null)

  // When the open spec changes, reset form + filters + clear error.
  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM)
      setBaseline(EMPTY_FORM)
      setLocal(EMPTY_LOCAL)
      setError(null)
      return
    }
    if (open.mode === "edit") {
      const next = buildEditForm(open.cutLog)
      setForm(next)
      setBaseline(next)
      setLocal(EMPTY_LOCAL)
    } else {
      // Create mode: seed inventoryId from the preset (if any) so a
      // "duplicate" flow opens with the source row's inventory pre-selected.
      // Baseline matches the seeded form so isDirty starts false — closing
      // an unmodified prefilled panel doesn't trigger a discard guard.
      const preset = open.presetInventory
      const seeded: CutLogEditForm = {
        ...EMPTY_FORM,
        inventoryId: preset?.id ?? "",
      }
      setForm(seeded)
      setBaseline(seeded)
      setLocal({
        locationFilter: "",
        pickedInventoryLabel: preset?.label ?? "",
        pickedInventoryStockUnitAbbrev: preset?.stockUnitAbbrev ?? "",
      })
    }
    setError(null)
  }, [open])

  const isDirty = useMemo(() => formIsDirty(form, baseline), [form, baseline])

  const openPanel = useCallback(
    (spec: CutLogEditPanelOpenSpec) => {
      // Defensive: callers without create capability should never pass
      // mode: "create". Silently no-op to keep the UI honest.
      if (spec.mode === "create" && !canCreate) return
      setOpen(spec)
    },
    [canCreate],
  )

  const setField = useCallback(
    <K extends keyof CutLogEditForm>(field: K, value: CutLogEditForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  const setLocationFilter = useCallback((next: string | null) => {
    setLocal((prev) => ({ ...prev, locationFilter: next ?? "" }))
  }, [])

  const setInventoryId = useCallback((id: string | null) => {
    setForm((prev) => ({ ...prev, inventoryId: id ?? "" }))
    if (id === null) {
      setLocal((prev) => ({
        ...prev,
        pickedInventoryLabel: "",
        pickedInventoryStockUnitAbbrev: "",
      }))
    }
    setError(null)
  }, [])

  const snapshotInventoryOption = useCallback((option: InventoryOption | null) => {
    setLocal((prev) => ({
      ...prev,
      pickedInventoryLabel: option?.inventoryItem ?? "",
      pickedInventoryStockUnitAbbrev: option?.stockUnitAbbrev ?? "",
    }))
  }, [])

  // Picking a new work order invalidates the current WOMI selection — the
  // dependent picker re-fetches under the new WO scope, so we null the WOMI
  // here to avoid carrying a stale id into the patch.
  const setWorkOrderId = useCallback((id: string | null) => {
    setForm((prev) =>
      prev.workOrderId === id
        ? prev
        : { ...prev, workOrderId: id, workOrderItemId: null },
    )
    setError(null)
  }, [])

  const setWorkOrderItemId = useCallback((id: string | null) => {
    setForm((prev) => ({ ...prev, workOrderItemId: id }))
    setError(null)
  }, [])

  const createMutation = useCreateCutLogMutation({
    scope,
    publish,
    setForm,
    setBaseline,
    setOpen,
    setError,
  })
  const updateMutation = useUpdateCutLogMutation({
    scope,
    publish,
    setForm,
    setBaseline,
    setOpen,
    setError,
  })
  const deleteMutation = useDeleteCutLogMutation({
    scope,
    publish,
    setOpen,
    setError,
  })
  const voidMutation = useVoidCutLogMutation({
    scope,
    publish,
    setForm,
    setBaseline,
    setOpen,
    setError,
  })
  const finalizeMutation = useFinalizeCutLogMutation({
    scope,
    publish,
    setForm,
    setBaseline,
    setOpen,
    setError,
  })

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    voidMutation.isPending ||
    finalizeMutation.isPending

  const save = useCallback(() => {
    if (!open || isSaving) return
    if (open.mode === "create") {
      if (!isCreateValid(form)) return
      createMutation.mutate({ workOrderItemId: open.workOrderItemId, form })
    } else {
      if (!isEditValid(form) || !isDirty) return
      updateMutation.mutate({
        workOrderItemId: open.workOrderItemId,
        cutLog: open.cutLog,
        form,
      })
    }
  }, [open, form, isDirty, isSaving, createMutation, updateMutation])

  const deleteCutLog = useCallback(() => {
    if (!open || open.mode !== "edit" || isSaving) return
    deleteMutation.mutate({ workOrderItemId: open.workOrderItemId, cutLog: open.cutLog })
  }, [open, isSaving, deleteMutation])

  const voidCutLog = useCallback(() => {
    if (!open || open.mode !== "edit" || isSaving) return
    voidMutation.mutate({ workOrderItemId: open.workOrderItemId, cutLog: open.cutLog })
  }, [open, isSaving, voidMutation])

  const finalize = useCallback(() => {
    if (!open || open.mode !== "edit" || isSaving || isDirty) return
    finalizeMutation.mutate({
      workOrderItemId: open.workOrderItemId,
      cutLog: open.cutLog,
    })
  }, [open, isDirty, isSaving, finalizeMutation])

  const close = useCallback(() => {
    if (isSaving) return
    setOpen(null)
  }, [isSaving])

  const discard = useCallback(() => {
    setForm(baseline)
    setError(null)
  }, [baseline])

  return {
    open,
    form,
    local,
    warehouseId: warehouseId ?? null,
    isDirty,
    isSaving,
    error,
    canCreate,
    openPanel,
    close,
    discard,
    setField,
    setLocationFilter,
    setInventoryId,
    snapshotInventoryOption,
    setWorkOrderId,
    setWorkOrderItemId,
    save,
    finalize,
    voidCutLog,
    deleteCutLog,
  }
}

export type CutLogEditPanelController = ReturnType<typeof useCutLogEditPanel>
