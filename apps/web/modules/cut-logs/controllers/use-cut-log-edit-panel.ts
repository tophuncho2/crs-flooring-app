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
  finalizeCutLogRequest,
  updatePendingCutLogRequest,
  voidCutLogRequest,
  type CutLogScopeUrl,
} from "@/modules/cut-logs/data/mutations"

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
 * Parents apply the patch to their cut-log snapshot (per-WOMI map on the
 * WO side, flat array on the inv side) to keep the section in sync
 * without a refetch.
 *
 * `workOrderItemId` is carried so the WO-side parent can route the patch
 * into the right WOMI bucket. The inv-side parent ignores it (its
 * snapshot is keyed by cut-log id).
 */
export type CutLogPanelPatch =
  | { kind: "upsert"; workOrderItemId: string | null; cutLog: CutLogRow }
  | { kind: "delete"; workOrderItemId: string | null; cutLogId: string }

export type CutLogEditPanelMode = "create" | "edit"

/**
 * Row shape the panel renders in edit mode. Widens `CutLogRow` with the two
 * server-resolved labels the inventory record view already surfaces on
 * `InventoryCutLogRow` (`workOrderNumber`, `workOrderItemProductLabel`).
 * Optional because mutation responses come back as plain `CutLogRow` —
 * callers (and the update-mutation handler) carry labels forward from the
 * prior snapshot.
 */
export type CutLogPanelRow = CutLogRow & {
  workOrderNumber?: string | null
  workOrderItemProductLabel?: string | null
}

/**
 * Optional prefill carried through create mode. Used by the work-orders
 * cut-log "duplicate" affordance to open the create panel with an inventory
 * item already selected (matching the source row). Carries the id + the two
 * picker-trigger labels so the `InventoryPicker` renders with the selection
 * visible immediately, before the user types into search.
 */
export type CutLogCreatePresetInventory = {
  id: string
  label: string
  stockUnitAbbrev: string | null
}

export type CutLogEditPanelOpenSpec =
  | {
      mode: "create"
      workOrderItemId: string
      productId: string
      presetInventory?: CutLogCreatePresetInventory
    }
  | { mode: "edit"; workOrderItemId: string | null; cutLog: CutLogPanelRow }

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
 * Scope-aware: `scope` drives the request URLs. WO callers pass
 * `{ kind: "work-order", workOrderId }`; inv callers pass
 * `{ kind: "inventory", inventoryId }`. `canCreate` gates whether the
 * create flow is reachable — WO callers pass true (with `warehouseId`
 * for the inventory picker); inv callers pass false (cut logs are only
 * created from WOMI rows in the UI).
 *
 * Mutation success → `publish(patch)` so the parent updates its snapshot.
 * Behavior contract:
 *   - Save (create) → close panel
 *   - Save (edit)   → stay open, refresh form to server values
 *   - Finalize      → close (status optimistically becomes FINAL)
 *   - Void          → close (status becomes VOID)
 *   - Delete        → close (row removed)
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

  // --- picker handlers (create mode only) ----------------------------------

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

  // --- mutations -----------------------------------------------------------

  const createMutation = useMutation({
    mutationFn: (input: { workOrderItemId: string; form: CutLogEditForm }) => {
      // Create is WO-only; runtime guard surfaces misuse as a clear error.
      if (scope.kind !== "work-order") {
        throw new Error(
          "createPendingCutLogRequest requires a work-order scope; canCreate must only be true on WO callers.",
        )
      }
      return createPendingCutLogRequest({
        workOrderId: scope.workOrderId,
        workOrderItemId: input.workOrderItemId,
        inventoryId: input.form.inventoryId,
        cut: input.form.cut,
        isWaste: input.form.isWaste,
        notes: input.form.notes,
      })
    },
    onSuccess: (response, variables) => {
      publish({
        kind: "upsert",
        workOrderItemId: variables.workOrderItemId,
        cutLog: response.cutLog,
      })
      // Stay open; transition create → edit on the newly-created row so the
      // user can keep working (finalize, tweak cut, etc.) without reopening
      // the panel.
      const next = buildEditForm(response.cutLog)
      setForm(next)
      setBaseline(next)
      setOpen({
        mode: "edit",
        workOrderItemId: variables.workOrderItemId,
        cutLog: response.cutLog,
      })
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const updateMutation = useMutation({
    mutationFn: (input: {
      workOrderItemId: string | null
      cutLog: CutLogRow
      form: CutLogEditForm
    }) =>
      updatePendingCutLogRequest({
        scope,
        cutLogId: input.cutLog.id,
        expectedUpdatedAt: input.cutLog.updatedAt,
        patch: {
          cut: input.form.cut,
          isWaste: input.form.isWaste,
          notes: input.form.notes,
        },
      }),
    onSuccess: (response, variables) => {
      publish({
        kind: "upsert",
        workOrderItemId: variables.workOrderItemId,
        cutLog: response.cutLog,
      })
      // Stay open; refresh form + baseline from the server-fresh row.
      const next = buildEditForm(response.cutLog)
      setForm(next)
      setBaseline(next)
      // Mutation responses are plain `CutLogRow` — carry the WO/WOMI labels
      // forward from the prior snapshot so the panel's read-only cells stay
      // populated. A pending-edit can't change the WO link, so labels are
      // still accurate.
      setOpen((prev) => ({
        mode: "edit",
        workOrderItemId: variables.workOrderItemId,
        cutLog: {
          ...response.cutLog,
          workOrderNumber:
            prev?.mode === "edit" ? (prev.cutLog.workOrderNumber ?? null) : null,
          workOrderItemProductLabel:
            prev?.mode === "edit"
              ? (prev.cutLog.workOrderItemProductLabel ?? null)
              : null,
        },
      }))
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (input: { workOrderItemId: string | null; cutLog: CutLogRow }) =>
      deletePendingCutLogRequest({
        scope,
        cutLogId: input.cutLog.id,
        expectedUpdatedAt: input.cutLog.updatedAt,
      }),
    onSuccess: (_response, variables) => {
      publish({
        kind: "delete",
        workOrderItemId: variables.workOrderItemId,
        cutLogId: variables.cutLog.id,
      })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const voidMutation = useMutation({
    mutationFn: (input: { workOrderItemId: string | null; cutLog: CutLogRow }) =>
      voidCutLogRequest({ scope, cutLogId: input.cutLog.id }),
    onSuccess: (response, variables) => {
      // Server returns the full voided row. Link cols + `location` are
      // already cleared, status is VOID. Fallback to an optimistic patch
      // if the server response is ever shaped without the row (defensive).
      const voided: CutLogRow =
        response.cutLog ??
        ({
          ...variables.cutLog,
          cut: "0",
          coverageCut: null,
          void: true,
          status: "VOID" as FlooringCutLogStatus,
        } satisfies CutLogRow)
      publish({
        kind: "upsert",
        workOrderItemId: variables.workOrderItemId,
        cutLog: voided,
      })
      setOpen(null)
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  const finalizeMutation = useMutation({
    mutationFn: (input: { workOrderItemId: string | null; cutLog: CutLogRow }) =>
      finalizeCutLogRequest({ scope, cutLogId: input.cutLog.id }),
    onSuccess: (response, variables) => {
      publish({
        kind: "upsert",
        workOrderItemId: variables.workOrderItemId,
        cutLog: response.cutLog,
      })
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
    save,
    finalize,
    voidCutLog,
    deleteCutLog,
  }
}

export type CutLogEditPanelController = ReturnType<typeof useCutLogEditPanel>
