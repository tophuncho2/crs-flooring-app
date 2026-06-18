"use client"

import { useCallback, useMemo, useState } from "react"
import type { InventoryAdjustmentRow, WorkOrderOption } from "@builders/domain"
import type { AdjustmentScopeUrl } from "@/modules/adjustments/data/mutations"
import { formatWorkOrderOptionTitle } from "@/modules/work-orders/components/picker/work-order-picker"
import {
  EMPTY_FORM,
  EMPTY_LOCAL,
  buildCreateForm,
  buildCreateLocal,
  buildEditForm,
  buildEditLocal,
  formIsDirty,
  isCreateValid,
  isEditValid,
} from "./form"
import type { AdjustmentPickerConfig } from "./types"
import {
  useCreateAdjustmentMutation,
  useDeleteAdjustmentMutation,
  useUpdateAdjustmentMutation,
} from "./mutations"
import type {
  AdjustmentEditForm,
  AdjustmentEditOpenSpec,
  AdjustmentEditLocal,
  AdjustmentEditPatch,
} from "./types"
import {
  normalizeRecordSectionError,
  type RecordSectionError,
} from "@/types/record/section-error"

/**
 * Owns the edit lifecycle for an adjustment record: open/close, current
 * row, editable form, dirty tracking, free-text location filter for create
 * mode, and composes the three adjustment mutation hooks (create / update /
 * delete). Every field — quantity included — is always editable; there is no
 * finalize/freeze, and the row's `before`/`after` recompute server-side on
 * every save.
 *
 * Scope-aware: `scope` drives the request URLs. WO callers pass
 * `{ kind: "work-order", workOrderId }`; inv callers pass
 * `{ kind: "inventory", inventoryId }`. `canCreate` gates whether the
 * create flow is reachable — the WO modal (any inventory, any product) and the
 * inventory hub (on that inventory) both pass true.
 *
 * Mutation success → `publish(patch)` so the parent updates its snapshot.
 * Behavior contract:
 *   - Save (create) → default: stay open, transition to edit on the new
 *                     row. When `onCreated` is provided, close instead
 *                     and let the consumer route the new row elsewhere.
 *   - Save (edit)   → stay open, refresh form to server values (incl. the
 *                     re-flowed before/after)
 *   - Delete        → close (row no longer exists)
 *   - Backdrop / ESC / X → close, discard unsaved
 */
export function useAdjustmentEditController({
  scope,
  canCreate,
  publish,
  onCreated,
}: {
  scope: AdjustmentScopeUrl
  canCreate: boolean
  publish: (patch: AdjustmentEditPatch) => void
  /**
   * Optional override for post-create routing. When provided, the panel
   * closes after a successful create and the consumer routes the new
   * row elsewhere (e.g. the WO modal refreshes its Adjustments grid).
   * When omitted, the default in-place create→edit flip is preserved.
   */
  onCreated?: (adjustment: InventoryAdjustmentRow) => void
}) {
  const [open, setOpen] = useState<AdjustmentEditOpenSpec | null>(null)
  const [form, setForm] = useState<AdjustmentEditForm>(EMPTY_FORM)
  const [baseline, setBaseline] = useState<AdjustmentEditForm>(EMPTY_FORM)
  const [local, setLocal] = useState<AdjustmentEditLocal>(EMPTY_LOCAL)
  const [error, setError] = useState<RecordSectionError | null>(null)

  // When the open spec changes, reset form + filters + clear error. Derived
  // during render (previous-value tracking).
  const [trackedOpen, setTrackedOpen] = useState(open)
  if (trackedOpen !== open) {
    // A mutation's onSuccess re-sets `open` to refresh the row snapshot (same
    // adjustment id, edit→edit). That is NOT a genuine open change: the
    // mutation already reconciled `form` + `baseline`, and `local` holds the
    // picker-trigger labels the user just picked. Rebuilding from
    // `open.adjustment` here would clobber those labels with its carried-
    // forward (stale-after-relink) enriched fields — reverting the work-order
    // trigger to the previously-linked WO until a fresh reopen. So on a
    // same-row refresh, only clear the error state.
    const isSameRowRefresh =
      trackedOpen?.mode === "edit" &&
      open?.mode === "edit" &&
      trackedOpen.adjustment.id === open.adjustment.id
    setTrackedOpen(open)
    if (isSameRowRefresh) {
      setError(null)
    } else if (!open) {
      setForm(EMPTY_FORM)
      setBaseline(EMPTY_FORM)
      setLocal(EMPTY_LOCAL)
      setError(null)
    } else {
      if (open.mode === "edit") {
        // Edit: form + locked-picker labels come off the row's frozen snapshot.
        const next = buildEditForm(open.adjustment)
        setForm(next)
        setBaseline(next)
        setLocal(buildEditLocal(open.adjustment))
      } else {
        // Create: form + picker-trigger labels come from the host's seed
        // (WO-create prefills WO/warehouse/material-item; hub-create prefills
        // the locked warehouse/inventory/location). Baseline matches the seed
        // so isDirty starts false — closing an unmodified prefilled panel
        // doesn't trigger a discard guard.
        const next = buildCreateForm(open.seed)
        setForm(next)
        setBaseline(next)
        setLocal(buildCreateLocal(open.seed))
      }
      setError(null)
    }
  }

  const isDirty = useMemo(() => formIsDirty(form, baseline), [form, baseline])

  // Whether the Save/Create button should be enabled. Create requires a valid
  // form; edit requires a valid form AND a pending change. Mirrors the `save()`
  // no-op guards so a record-view sub-header can disable the button instead of
  // rendering it enabled-but-inert.
  const canSave = useMemo(() => {
    if (!open) return false
    return open.mode === "create" ? isCreateValid(form) : isEditValid(form) && isDirty
  }, [open, form, isDirty])

  // Derived from the open spec: per-picker editable/locked/hidden state.
  const pickerConfig: AdjustmentPickerConfig | null = open?.pickerConfig ?? null

  const openPanel = useCallback(
    (spec: AdjustmentEditOpenSpec) => {
      // Defensive: callers without create capability should never pass
      // mode: "create". Silently no-op to keep the UI honest.
      if (spec.mode === "create" && !canCreate) return
      setOpen(spec)
    },
    [canCreate],
  )

  const setField = useCallback(
    <K extends keyof AdjustmentEditForm>(field: K, value: AdjustmentEditForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  // Work-order link select for the relink flow. Adjustments link to a work
  // order (any product) with no material-item resolution — so this just sets
  // `workOrderId` + the trigger label (or clears both on a null pick).
  const selectWorkOrderOption = useCallback((option: WorkOrderOption | null) => {
    if (!option) {
      setForm((prev) => ({ ...prev, workOrderId: null }))
      setLocal((prev) => ({ ...prev, pickedWorkOrderLabel: "" }))
      setError(null)
      return
    }
    setForm((prev) => ({ ...prev, workOrderId: option.id }))
    setLocal((prev) => ({ ...prev, pickedWorkOrderLabel: formatWorkOrderOptionTitle(option) }))
    setError(null)
  }, [])

  const createMutation = useCreateAdjustmentMutation({
    publish,
    setForm,
    setBaseline,
    setOpen,
    setError,
    onCreated,
  })
  const updateMutation = useUpdateAdjustmentMutation({
    scope,
    publish,
    setForm,
    setBaseline,
    setOpen,
    setError,
  })
  const deleteMutation = useDeleteAdjustmentMutation({
    scope,
    onDeleted: (deletedId) => {
      // Emit a "delete" patch so the parent drops the row from its snapshot, then
      // close the edit panel.
      publish({ kind: "delete", adjustmentId: deletedId })
      setOpen(null)
    },
    onError: (err) =>
      setError(normalizeRecordSectionError(err, { defaultMessage: "Failed to delete adjustment" })),
  })

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending

  // `opts.onSaved` runs after a successful create/update (threaded as the
  // per-call react-query `onSuccess`, so it fires after the hook-level success
  // that publishes the patch). The "Save and split" action uses it to route to
  // the split-off create form once the adjustment commits.
  const save = useCallback(
    (opts?: { onSaved?: () => void }) => {
      if (!open || isSaving) return
      const mutateOptions = opts?.onSaved ? { onSuccess: () => opts.onSaved?.() } : undefined
      if (open.mode === "create") {
        if (!isCreateValid(form)) return
        // Unified create path: the form always carries the chosen inventory +
        // (optional) WO link + warehouse filter; the mutation posts to the
        // inventory route regardless of which surface opened the panel.
        createMutation.mutate({ form }, mutateOptions)
      } else {
        if (!isEditValid(form) || !isDirty) return
        updateMutation.mutate(
          {
            adjustment: open.adjustment,
            form,
          },
          mutateOptions,
        )
      }
    },
    [open, form, isDirty, isSaving, createMutation, updateMutation],
  )

  // Returns a promise that resolves once the delete commits (and rejects on
  // error, with `onError` already having surfaced it) so the caller can sequence
  // its navigate-back-to-list off a successful settle.
  const deleteAdjustment = useCallback(() => {
    if (!open || open.mode !== "edit" || isSaving) return Promise.resolve()
    return deleteMutation.mutateAsync({
      adjustment: open.adjustment,
    })
  }, [open, isSaving, deleteMutation])

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
    pickerConfig,
    isDirty,
    canSave,
    isSaving,
    error,
    canCreate,
    openPanel,
    close,
    discard,
    setField,
    selectWorkOrderOption,
    save,
    deleteAdjustment,
  }
}

export type AdjustmentEditController = ReturnType<typeof useAdjustmentEditController>
