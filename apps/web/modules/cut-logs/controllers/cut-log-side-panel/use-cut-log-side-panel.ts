"use client"

import { useCallback, useMemo, useState } from "react"
import type {
  CutLogRow,
  InventoryOption,
  WorkOrderMaterialItemOption,
  WorkOrderOption,
} from "@builders/domain"
import type { CutLogScopeUrl } from "@/modules/cut-logs/data/mutations"
import { formatWorkOrderOptionTitle } from "@/modules/work-orders/components/picker/work-order-picker"
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
import type { RecordSectionError } from "@/types/record/section-error"

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
 *   - Save (create) → default: stay open, transition to edit on the new
 *                     row. When `onCreated` is provided, close instead
 *                     and let the consumer route the new row elsewhere.
 *   - Save (edit)   → stay open, refresh form to server values
 *   - Finalize      → stay open on the now-FINAL row (input cells go
 *                     read-only via `isCutLogPendingEditable`)
 *   - Void          → stay open on the now-VOID row (input cells go
 *                     read-only)
 *   - Delete        → close (row no longer exists)
 *   - Backdrop / ESC / X → close, discard unsaved
 */
export type CutLogPanelPickerKind = "location" | "inventory"

export function useCutLogEditPanel({
  scope,
  warehouseId,
  canCreate,
  publish,
  onCreated,
}: {
  scope: CutLogScopeUrl
  /** Required when `canCreate` is true — drives the inventory picker. */
  warehouseId?: string | null
  canCreate: boolean
  publish: (patch: CutLogPanelPatch) => void
  /**
   * Optional override for post-create routing. When provided, the panel
   * closes after a successful create and the consumer routes the new
   * row elsewhere (e.g. WO hands off to the inventory-hub edit panel).
   * When omitted, the default in-place create→edit flip is preserved.
   */
  onCreated?: (cutLog: CutLogRow, workOrderItemId: string) => void
}) {
  const [open, setOpen] = useState<CutLogEditPanelOpenSpec | null>(null)
  const [form, setForm] = useState<CutLogEditForm>(EMPTY_FORM)
  const [baseline, setBaseline] = useState<CutLogEditForm>(EMPTY_FORM)
  const [local, setLocal] = useState<CutLogPanelLocal>(EMPTY_LOCAL)
  const [error, setError] = useState<RecordSectionError | null>(null)
  // Body-takeover picker state for the create-mode Location + Inventory
  // pickers. Mirrors the template-sync / property-hub picker takeover
  // pattern — the panel body swaps to the picker listbox while a kind is
  // active. Resets to null on close, on open spec change, and on commit.
  const [pickerKind, setPickerKind] = useState<CutLogPanelPickerKind | null>(null)

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

  // Body-takeover picker controls. The panel renders a HubSidePanelPicker
  // in its body while `pickerKind` is non-null; commit handlers below
  // close the takeover and update form state in one render.
  //
  // `openPicker` toggles — clicking the active trigger closes the picker
  // (matches the template-sync top-toolbar pattern). The trigger fires
  // it unconditionally and the function decides open vs. close.
  const openPicker = useCallback((kind: CutLogPanelPickerKind) => {
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

  // Picking a new work order invalidates the current WOMI selection — the
  // dependent picker re-fetches under the new WO scope, so we null the WOMI
  // here to avoid carrying a stale id into the patch.
  const setWorkOrderId = useCallback((id: string | null) => {
    setForm((prev) =>
      prev.workOrderId === id
        ? prev
        : { ...prev, workOrderId: id, workOrderItemId: null },
    )
    // Mirror the form-side cascade: clearing the WOMI id also clears its
    // snapshot label so the dependent picker's trigger doesn't carry the
    // stale label from the old WO into the new scope.
    setLocal((prev) => ({ ...prev, pickedWorkOrderItemLabel: "" }))
    setError(null)
  }, [])

  const setWorkOrderItemId = useCallback((id: string | null) => {
    setForm((prev) => ({ ...prev, workOrderItemId: id }))
    setError(null)
  }, [])

  const snapshotWorkOrderOption = useCallback((option: WorkOrderOption | null) => {
    setLocal((prev) => ({
      ...prev,
      pickedWorkOrderLabel: option ? formatWorkOrderOptionTitle(option) : "",
    }))
  }, [])

  const snapshotWorkOrderItemOption = useCallback(
    (option: WorkOrderMaterialItemOption | null) => {
      setLocal((prev) => ({
        ...prev,
        pickedWorkOrderItemLabel: option?.productName ?? "",
      }))
    },
    [],
  )

  const createMutation = useCreateCutLogMutation({
    scope,
    publish,
    setForm,
    setBaseline,
    setOpen,
    setError,
    onCreated,
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
    setWorkOrderId,
    setWorkOrderItemId,
    snapshotWorkOrderOption,
    snapshotWorkOrderItemOption,
    save,
    finalize,
    voidCutLog,
    deleteCutLog,
  }
}

export type CutLogEditPanelController = ReturnType<typeof useCutLogEditPanel>
