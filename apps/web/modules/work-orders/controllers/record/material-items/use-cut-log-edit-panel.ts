"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import type {
  CutLogRow,
  FlooringCutLogStatus,
  InventoryOption,
} from "@builders/domain"
import {
  createPendingCutLogRequest,
  deletePendingCutLogRequest,
  finalizeWorkOrderCutLogRequest,
  updatePendingCutLogRequest,
  voidWorkOrderCutLogRequest,
} from "@/modules/work-orders/data/mutations"

/**
 * Editable form values for the cut-log edit panel. `inventoryId` is editable
 * only in create mode; saved rows treat it as immutable.
 */
export type CutLogEditForm = {
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
}

const EMPTY_FORM: CutLogEditForm = {
  inventoryId: "",
  cut: "",
  isWaste: false,
  notes: "",
}

/**
 * UI-only narrowing filter (free-text location) plus snapshot label + unit
 * for the picker trigger. None of these ship to the cut-log API — the
 * persisted row carries only `inventoryId`. Local state lives outside
 * `CutLogEditForm` so the dirty check + mutation payload stay clean.
 */
type CutLogPanelLocal = {
  locationFilter: string
  pickedInventoryLabel: string
  pickedInventoryStockUnitAbbrev: string
}

const EMPTY_LOCAL: CutLogPanelLocal = {
  locationFilter: "",
  pickedInventoryLabel: "",
  pickedInventoryStockUnitAbbrev: "",
}

/**
 * Local "patch" emitted to the parent when a cut-log mutation completes.
 * Parents apply the patch to their `cutLogsByWorkOrderItemId` snapshot to
 * keep the section in sync without a refetch.
 */
export type CutLogPanelPatch =
  | { kind: "upsert"; workOrderItemId: string; cutLog: CutLogRow }
  | { kind: "delete"; workOrderItemId: string; cutLogId: string }

export type CutLogEditPanelMode = "create" | "edit"

export type CutLogEditPanelOpenSpec =
  | { mode: "create"; workOrderItemId: string; productId: string }
  | { mode: "edit"; workOrderItemId: string; cutLog: CutLogRow }

function buildEditForm(cutLog: CutLogRow): CutLogEditForm {
  return {
    inventoryId: cutLog.inventoryId,
    cut: cutLog.cut,
    isWaste: cutLog.isWaste,
    notes: cutLog.notes,
  }
}

function formIsDirty(current: CutLogEditForm, baseline: CutLogEditForm): boolean {
  return (
    current.inventoryId !== baseline.inventoryId ||
    current.cut !== baseline.cut ||
    current.isWaste !== baseline.isWaste ||
    current.notes !== baseline.notes
  )
}

function isCreateValid(form: CutLogEditForm): boolean {
  return form.inventoryId !== "" && form.cut.trim() !== ""
}

function isEditValid(form: CutLogEditForm): boolean {
  return form.cut.trim() !== ""
}

/**
 * Owns the side-panel lifecycle for cut-log editing: open/close, current
 * row, editable form, dirty tracking, free-text location filter for create
 * mode, and all four mutations (create / update / delete / void) plus
 * single-row finalize.
 *
 * Mutation success → `publish(patch)` so the parent updates its snapshot.
 * Behavior contract (locked in the plan):
 *   - Save (create) → close panel
 *   - Save (edit)   → stay open, refresh form to server values
 *   - Finalize      → close (status optimistically becomes FINAL)
 *   - Void          → close (status becomes VOID)
 *   - Delete        → close (row removed)
 *   - Backdrop / ESC / X → close, discard unsaved
 */
export function useCutLogEditPanel({
  workOrderId,
  warehouseId,
  publish,
}: {
  workOrderId: string
  warehouseId: string | null
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
    } else {
      setForm(EMPTY_FORM)
      setBaseline(EMPTY_FORM)
    }
    setLocal(EMPTY_LOCAL)
    setError(null)
  }, [open])

  const isDirty = useMemo(() => formIsDirty(form, baseline), [form, baseline])

  const openPanel = useCallback((spec: CutLogEditPanelOpenSpec) => {
    setOpen(spec)
  }, [])

  const setField = useCallback(
    <K extends keyof CutLogEditForm>(field: K, value: CutLogEditForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  // --- picker handlers (create mode only) ----------------------------------

  const setLocationFilter = useCallback((next: string) => {
    setLocal((prev) => ({ ...prev, locationFilter: next }))
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

  // Inventory option snapshot carries both the trigger label AND the stock
  // unit abbreviation — the cut cell's unit suffix reads from this snapshot
  // until the row is saved (after which the cut log's frozen
  // `stockUnitAbbrev` snapshot takes over).
  const snapshotInventoryOption = useCallback((option: InventoryOption | null) => {
    setLocal((prev) => ({
      ...prev,
      pickedInventoryLabel: option?.inventoryItem ?? "",
      pickedInventoryStockUnitAbbrev: option?.stockUnitAbbrev ?? "",
    }))
  }, [])

  // --- mutations -----------------------------------------------------------

  const createMutation = useMutation({
    mutationFn: (input: { workOrderItemId: string; form: CutLogEditForm }) =>
      createPendingCutLogRequest({
        workOrderId,
        workOrderItemId: input.workOrderItemId,
        inventoryId: input.form.inventoryId,
        cut: input.form.cut,
        isWaste: input.form.isWaste,
        notes: input.form.notes,
      }),
    onSuccess: (response, variables) => {
      publish({ kind: "upsert", workOrderItemId: variables.workOrderItemId, cutLog: response.cutLog })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: { workOrderItemId: string; cutLog: CutLogRow; form: CutLogEditForm }) =>
      updatePendingCutLogRequest({
        workOrderId,
        cutLogId: input.cutLog.id,
        workOrderItemId: input.workOrderItemId,
        expectedUpdatedAt: input.cutLog.updatedAt,
        patch: {
          cut: input.form.cut,
          isWaste: input.form.isWaste,
          notes: input.form.notes,
        },
      }),
    onSuccess: (response, variables) => {
      publish({ kind: "upsert", workOrderItemId: variables.workOrderItemId, cutLog: response.cutLog })
      // Stay open; refresh form + baseline from the server-fresh row.
      const next = buildEditForm(response.cutLog)
      setForm(next)
      setBaseline(next)
      setOpen({ mode: "edit", workOrderItemId: variables.workOrderItemId, cutLog: response.cutLog })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (input: { workOrderItemId: string; cutLog: CutLogRow }) =>
      deletePendingCutLogRequest({
        workOrderId,
        cutLogId: input.cutLog.id,
        workOrderItemId: input.workOrderItemId,
        expectedUpdatedAt: input.cutLog.updatedAt,
      }),
    onSuccess: (_response, variables) => {
      publish({ kind: "delete", workOrderItemId: variables.workOrderItemId, cutLogId: variables.cutLog.id })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const voidMutation = useMutation({
    mutationFn: (input: { workOrderItemId: string; cutLog: CutLogRow }) =>
      voidWorkOrderCutLogRequest({
        workOrderId,
        cutLogId: input.cutLog.id,
      }),
    onSuccess: (_response, variables) => {
      // Optimistic patch: cut → "0", coverage → null, void → true,
      // status → VOID. Mirrors the post-void server shape.
      const voided: CutLogRow = {
        ...variables.cutLog,
        cut: "0",
        coverageCut: null,
        void: true,
        status: "VOID" as FlooringCutLogStatus,
      }
      publish({ kind: "upsert", workOrderItemId: variables.workOrderItemId, cutLog: voided })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const finalizeMutation = useMutation({
    mutationFn: (input: { workOrderItemId: string; cutLog: CutLogRow }) =>
      finalizeWorkOrderCutLogRequest({
        workOrderId,
        cutLogId: input.cutLog.id,
      }),
    onSuccess: (response, variables) => {
      publish({ kind: "upsert", workOrderItemId: variables.workOrderItemId, cutLog: response.cutLog })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  // --- public actions ------------------------------------------------------

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
      updateMutation.mutate({ workOrderItemId: open.workOrderItemId, cutLog: open.cutLog, form })
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
    finalizeMutation.mutate({ workOrderItemId: open.workOrderItemId, cutLog: open.cutLog })
  }, [open, isDirty, isSaving, finalizeMutation])

  const close = useCallback(() => {
    if (isSaving) return
    setOpen(null)
  }, [isSaving])

  return {
    open,
    form,
    local,
    warehouseId,
    isDirty,
    isSaving,
    error,
    openPanel,
    close,
    setField,
    setLocationFilter,
    setInventoryId,
    snapshotInventoryOption,
    save,
    finalize,
    voidCutLog,
    deleteCutLog,
  }
}

export type CutLogEditPanelController = ReturnType<typeof useCutLogEditPanel>
