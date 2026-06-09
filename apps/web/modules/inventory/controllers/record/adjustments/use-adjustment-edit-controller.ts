"use client"

import { useCallback, useMemo, useState } from "react"
import type { InventoryAdjustmentRow, WorkOrderOption } from "@builders/domain"
import type { AdjustmentScopeUrl } from "@/modules/adjustments/data/mutations"
import { formatWorkOrderOptionTitle } from "@/modules/work-orders/components/picker/work-order-picker"
import { searchWorkOrderMaterialItemOptionsRequest } from "@/modules/work-orders/data/work-order-material-item-options-request"
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
import { createRecordSectionError, type RecordSectionError } from "@/types/record/section-error"

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
 * create flow is reachable — WO callers pass true (with `warehouseId`
 * for the inventory picker); inv callers pass false (adjustments are only
 * created from WOMI rows in the UI).
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
   * row elsewhere (e.g. WO hands off to the inventory-hub edit panel).
   * When omitted, the default in-place create→edit flip is preserved.
   */
  onCreated?: (adjustment: InventoryAdjustmentRow, workOrderItemId: string | null) => void
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

  // Derived from the open spec: per-picker editable/locked/hidden state, and
  // the fixed product id (inventory is single-product per open) used to scope
  // the WO-relink picker + WOMI auto-resolve.
  const pickerConfig: AdjustmentPickerConfig | null = open?.pickerConfig ?? null
  const productId =
    open?.mode === "edit"
      ? open.adjustment.productId
      : open?.mode === "create"
        ? (open.seed.productId ?? null)
        : null

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

  // Single atomic work-order commit for the relink flow. The material-item
  // picker is gone: a adjustment's product is fixed and WOMIs are unique per
  // (workOrder, product), so selecting a WO deterministically resolves the one
  // matching material item — we fetch it and link it here, moving the form +
  // trigger labels together in one path (mirrors `selectInventoryOption`).
  //
  // Sets the WO + label immediately, nulls the WOMI, then resolves the match.
  // A stale-guard drops a resolve whose WO was superseded by a newer pick. The
  // no-match branch is defensive only — the picker is pre-filtered to WOs that
  // carry this product, so it shouldn't fire.
  const selectWorkOrderOption = useCallback(
    async (option: WorkOrderOption | null) => {
      if (!option) {
        setForm((prev) => ({ ...prev, workOrderId: null, workOrderItemId: null }))
        setLocal((prev) => ({
          ...prev,
          pickedWorkOrderLabel: "",
          pickedWorkOrderItemLabel: "",
          pickedWorkOrderItemNotes: "",
        }))
        setError(null)
        return
      }

      const workOrderId = option.id
      setForm((prev) => ({ ...prev, workOrderId, workOrderItemId: null }))
      setLocal((prev) => ({
        ...prev,
        pickedWorkOrderLabel: formatWorkOrderOptionTitle(option),
        pickedWorkOrderItemLabel: "",
        pickedWorkOrderItemNotes: "",
      }))
      setError(null)

      // Product is fixed per open (edit: the row's product; create: the seed's).
      // Resolves the one matching WOMI on the chosen WO, in both modes.
      if (!productId) return

      try {
        const matches = await searchWorkOrderMaterialItemOptionsRequest(
          "",
          undefined,
          { workOrderId, productId, take: 1 },
        )
        const match = matches[0] ?? null
        // Stale-guard: ignore a resolve whose WO was superseded by a newer pick.
        setForm((prev) =>
          prev.workOrderId === workOrderId
            ? { ...prev, workOrderItemId: match?.id ?? null }
            : prev,
        )
        if (match) {
          setLocal((prev) => ({
            ...prev,
            pickedWorkOrderItemLabel: match.productName,
            pickedWorkOrderItemNotes: match.notes,
          }))
        } else {
          // Defensive — picker only lists WOs carrying this product. Revert the
          // WO so the form stays link-symmetric and tell the user why.
          const productName = open?.mode === "edit" ? open.adjustment.productName : "this product"
          setForm((prev) =>
            prev.workOrderId === workOrderId
              ? { ...prev, workOrderId: null, workOrderItemId: null }
              : prev,
          )
          setLocal((prev) => ({
            ...prev,
            pickedWorkOrderLabel: "",
            pickedWorkOrderItemLabel: "",
            pickedWorkOrderItemNotes: "",
          }))
          setError(
            createRecordSectionError({
              kind: "validation",
              message: `This work order has no material item for ${productName}.`,
              retryable: true,
            }),
          )
        }
      } catch (err) {
        setError(
          createRecordSectionError({
            kind: "transport",
            message: "Could not resolve the work order's material item.",
            retryable: true,
            details: { error: String(err) },
          }),
        )
      }
    },
    [open, productId],
  )

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
    publish,
    setOpen,
    setError,
  })

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending

  const save = useCallback(() => {
    if (!open || isSaving) return
    if (open.mode === "create") {
      if (!isCreateValid(form)) return
      // Unified create path: the form always carries the chosen inventory +
      // (optional) WO link + warehouse filter; the mutation posts to the
      // inventory route regardless of which surface opened the panel.
      createMutation.mutate({ form })
    } else {
      if (!isEditValid(form) || !isDirty) return
      updateMutation.mutate({
        workOrderItemId: open.workOrderItemId,
        adjustment: open.adjustment,
        form,
      })
    }
  }, [open, form, isDirty, isSaving, createMutation, updateMutation])

  const deleteAdjustment = useCallback(() => {
    if (!open || open.mode !== "edit" || isSaving) return
    deleteMutation.mutate({ workOrderItemId: open.workOrderItemId, adjustment: open.adjustment })
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
    productId,
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
