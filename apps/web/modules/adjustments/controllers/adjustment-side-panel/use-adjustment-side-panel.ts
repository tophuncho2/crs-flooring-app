"use client"

import { useCallback, useMemo, useState } from "react"
import type {
  InventoryAdjustmentRow,
  InventoryOption,
  WorkOrderOption,
} from "@builders/domain"
import type { AdjustmentScopeUrl } from "@/modules/adjustments/data/mutations"
import { formatWorkOrderOptionTitle } from "@/modules/work-orders/components/picker/work-order-picker"
import { searchWorkOrderMaterialItemOptionsRequest } from "@/modules/work-orders/data/work-order-material-item-options-request"
import {
  EMPTY_FORM,
  EMPTY_LOCAL,
  buildEditForm,
  formIsDirty,
  isCreateValid,
  isEditValid,
  isManualCreateValid,
} from "./form"
import {
  useCreateAdjustmentMutation,
  useDeleteAdjustmentMutation,
  useFinalizeAdjustmentMutation,
  useUpdateAdjustmentMutation,
} from "./mutations"
import type {
  AdjustmentEditForm,
  AdjustmentEditPanelOpenSpec,
  AdjustmentPanelLocal,
  AdjustmentPanelPatch,
} from "./types"
import { createRecordSectionError, type RecordSectionError } from "@/types/record/section-error"

/**
 * Owns the side-panel lifecycle for adjustment editing: open/close, current
 * row, editable form, dirty tracking, free-text location filter for create
 * mode, and composes all five adjustment mutation hooks (create / update /
 * delete / void / finalize).
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
 *   - Save (edit)   → stay open, refresh form to server values
 *   - Finalize      → stay open on the now-FINAL row (input cells go
 *                     read-only via `isAdjustmentPendingEditable`)
 *   - Void          → stay open on the now-VOID row (input cells go
 *                     read-only)
 *   - Delete        → close (row no longer exists)
 *   - Backdrop / ESC / X → close, discard unsaved
 */
export type AdjustmentPanelPickerKind = "location" | "inventory"

export function useAdjustmentEditPanel({
  scope,
  warehouseId,
  canCreate,
  publish,
  onCreated,
}: {
  scope: AdjustmentScopeUrl
  /** Required when `canCreate` is true — drives the inventory picker. */
  warehouseId?: string | null
  canCreate: boolean
  publish: (patch: AdjustmentPanelPatch) => void
  /**
   * Optional override for post-create routing. When provided, the panel
   * closes after a successful create and the consumer routes the new
   * row elsewhere (e.g. WO hands off to the inventory-hub edit panel).
   * When omitted, the default in-place create→edit flip is preserved.
   */
  onCreated?: (adjustment: InventoryAdjustmentRow, workOrderItemId: string | null) => void
}) {
  const [open, setOpen] = useState<AdjustmentEditPanelOpenSpec | null>(null)
  const [form, setForm] = useState<AdjustmentEditForm>(EMPTY_FORM)
  const [baseline, setBaseline] = useState<AdjustmentEditForm>(EMPTY_FORM)
  const [local, setLocal] = useState<AdjustmentPanelLocal>(EMPTY_LOCAL)
  const [error, setError] = useState<RecordSectionError | null>(null)
  // Body-takeover picker state for the create-mode Location + Inventory
  // pickers. Mirrors the template-sync / property-hub picker takeover
  // pattern — the panel body swaps to the picker listbox while a kind is
  // active. Resets to null on close, on open spec change, and on commit.
  const [pickerKind, setPickerKind] = useState<AdjustmentPanelPickerKind | null>(null)

  // When the open spec changes, reset form + filters + clear error. Derived
  // during render (previous-value tracking); `open` is local state so its ref
  // only changes on open/close/mode-switch — it can't loop.
  const [trackedOpen, setTrackedOpen] = useState(open)
  if (trackedOpen !== open) {
    setTrackedOpen(open)
    if (!open) {
      setForm(EMPTY_FORM)
      setBaseline(EMPTY_FORM)
      setLocal(EMPTY_LOCAL)
      setPickerKind(null)
      setError(null)
    } else {
      if (open.mode === "edit") {
        const next = buildEditForm(open.adjustment)
        setForm(next)
        setBaseline(next)
        setLocal(EMPTY_LOCAL)
      } else if (open.variant === "manual") {
        // Manual create (inventory hub): the parent inventory is fixed on the
        // spec; the form carries only direction + amount + notes. Defaults to
        // INCREASE via EMPTY_FORM. Baseline matches so isDirty starts false.
        const seeded: AdjustmentEditForm = {
          ...EMPTY_FORM,
          inventoryId: open.inventoryId,
        }
        setForm(seeded)
        setBaseline(seeded)
        setLocal(EMPTY_LOCAL)
      } else {
        // WO "cut" create: seed inventoryId from the preset (if any) so a
        // "duplicate" flow opens with the source row's inventory pre-selected.
        // Baseline matches the seeded form so isDirty starts false — closing
        // an unmodified prefilled panel doesn't trigger a discard guard.
        const preset = open.presetInventory
        const seeded: AdjustmentEditForm = {
          ...EMPTY_FORM,
          inventoryId: preset?.id ?? "",
        }
        setForm(seeded)
        setBaseline(seeded)
        setLocal({
          ...EMPTY_LOCAL,
          pickedInventoryLabel: preset?.label ?? "",
          pickedInventoryStockUnitAbbrev: preset?.stockUnitAbbrev ?? "",
        })
      }
      setPickerKind(null)
      setError(null)
    }
  }

  const isDirty = useMemo(() => formIsDirty(form, baseline), [form, baseline])

  const openPanel = useCallback(
    (spec: AdjustmentEditPanelOpenSpec) => {
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

  const setLocationFilter = useCallback((next: string | null) => {
    setLocal((prev) => ({ ...prev, locationFilter: next ?? "" }))
  }, [])

  // Body-takeover picker controls. The panel renders a HubSidePanelPicker
  // in its body while `pickerKind` is non-null; commit handlers below
  // close the takeover and update form state in one render.
  //
  // `openPicker` toggles — clicking the active trigger closes the picker
  // (matches the template-sync top-toolbar pattern). The trigger fires
  // it unconditionally and the function decides open vs. close.
  const openPicker = useCallback((kind: AdjustmentPanelPickerKind) => {
    setPickerKind((current) => (current === kind ? null : kind))
  }, [])

  const closePicker = useCallback(() => {
    setPickerKind(null)
  }, [])

  // Single source of truth for inventory selection: the picker hands the
  // full option (or null for clear) and the form + local labels move together
  // in one render. The legacy split (setInventoryId + snapshotInventoryOption)
  // raced when the dropdown's commit path reset its search query between the
  // two callbacks — the label would lag behind the form value until save
  // rebuilt the form from the server response. Inventory is immutable after
  // create, so this only fires from the create-mode picker. Closes the
  // takeover after commit.
  const selectInventoryOption = useCallback((option: InventoryOption | null) => {
    setForm((prev) => ({ ...prev, inventoryId: option?.id ?? "" }))
    setLocal((prev) => ({
      ...prev,
      pickedInventoryLabel: option?.inventoryItem ?? "",
      pickedInventoryStockUnitAbbrev: option?.stockUnitAbbrev ?? "",
    }))
    setPickerKind(null)
    setError(null)
  }, [])

  // Atomic location-filter commit that also closes the picker takeover.
  // The plain `setLocationFilter` stays available for any callers that
  // need to write the filter without closing a takeover.
  const selectLocationFilter = useCallback((value: string | null) => {
    setLocal((prev) => ({ ...prev, locationFilter: value ?? "" }))
    setPickerKind(null)
    setError(null)
  }, [])

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

      const productId = open?.mode === "edit" ? open.adjustment.productId : null
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
    [open],
  )

  const createMutation = useCreateAdjustmentMutation({
    scope,
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
  const finalizeMutation = useFinalizeAdjustmentMutation({
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
    finalizeMutation.isPending

  const save = useCallback(() => {
    if (!open || isSaving) return
    if (open.mode === "create") {
      if (open.variant === "manual") {
        if (!isManualCreateValid(form)) return
        createMutation.mutate({ variant: "manual", inventoryId: open.inventoryId, form })
        return
      }
      if (!isCreateValid(form)) return
      createMutation.mutate({ variant: "cut", workOrderItemId: open.workOrderItemId, form })
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

  const finalize = useCallback(() => {
    if (!open || open.mode !== "edit" || isSaving || isDirty) return
    finalizeMutation.mutate({
      workOrderItemId: open.workOrderItemId,
      adjustment: open.adjustment,
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
    pickerKind,
    openPanel,
    close,
    discard,
    setField,
    setLocationFilter,
    selectLocationFilter,
    selectInventoryOption,
    openPicker,
    closePicker,
    selectWorkOrderOption,
    save,
    finalize,
    deleteAdjustment,
  }
}

export type AdjustmentEditPanelController = ReturnType<typeof useAdjustmentEditPanel>
