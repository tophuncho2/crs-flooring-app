"use client"

import { useCallback, useMemo, useState } from "react"
import {
  toInventoryForm,
  type InventoryDetail,
  type InventoryForm,
  type InventoryRow,
} from "@builders/domain"
import type { InventoryDetailRecord } from "@builders/db"
import { useInventoryListMutations } from "@/modules/inventory/controllers/list/use-inventory-list-mutations"
import { EMPTY_INVENTORY_FORM, inventoryFormIsDirty } from "./form"

export type UseHubInventoryEditArgs = {
  /** True when current mode is section-edit-inventory; gates reconcile. */
  isActive: boolean
  /** Current inventory snapshot the hub renders. */
  inventory: InventoryRow | null
  clearError: () => void
}

export type CommitInventoryUpdateCallbacks = {
  onSuccess?: (inventory: InventoryDetail) => void
  onError?: (error: unknown) => void
}

export type HubInventoryEditSlice = {
  form: InventoryForm
  baseline: InventoryForm
  updatedAt: string | null
  isDirty: boolean
  setField: <K extends keyof InventoryForm>(field: K, value: InventoryForm[K]) => void
  reset: () => void
  resetToBaseline: () => void
  hydrateFromRow: (form: InventoryForm, updatedAt: string) => void
  applyServerSnapshot: (form: InventoryForm, updatedAt: string) => void
  isPending: boolean
  commitUpdate: (id: string, callbacks: CommitInventoryUpdateCallbacks) => void
}

/**
 * Inventory section-edit slice. Owns the editable inventory form, its
 * baseline (for dirty + discard), and the row-revision token used for
 * optimistic-locking updates. Reconciles from the current inventory
 * snapshot when not dirty.
 *
 * Three fields move through the UI: archive / location / internalNotes.
 * roll# / dye lot / note are part of the canonical mutation contract
 * (`InventoryForm` and `UpdateInventoryInput` both carry them) but the
 * hub renders them as `StaticFieldValue` — matching the existing record
 * view's block — so the slice carries the baseline values forward
 * untouched.
 */
export function useHubInventoryEdit({
  isActive,
  inventory,
  clearError,
}: UseHubInventoryEditArgs): HubInventoryEditSlice {
  const [form, setForm] = useState<InventoryForm>(EMPTY_INVENTORY_FORM)
  const [baseline, setBaseline] = useState<InventoryForm>(EMPTY_INVENTORY_FORM)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const reset = useCallback(() => {
    setForm(EMPTY_INVENTORY_FORM)
    setBaseline(EMPTY_INVENTORY_FORM)
    setUpdatedAt(null)
  }, [])

  const resetToBaseline = useCallback(() => {
    setForm(baseline)
  }, [baseline])

  const setField = useCallback(
    <K extends keyof InventoryForm>(field: K, value: InventoryForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      clearError()
    },
    [clearError],
  )

  const applyServerSnapshot = useCallback(
    (next: InventoryForm, nextUpdatedAt: string) => {
      setForm(next)
      setBaseline(next)
      setUpdatedAt(nextUpdatedAt)
    },
    [],
  )

  const hydrateFromRow = useCallback(
    (next: InventoryForm, nextUpdatedAt: string) => {
      setForm(next)
      setBaseline(next)
      setUpdatedAt(nextUpdatedAt)
    },
    [],
  )

  // Reconcile baseline from the latest snapshot the caller hands us — derived
  // during render so it lands before paint. Preserves an in-flight user edit;
  // otherwise pulls the freshest values. (`inventory` is a stable ref per active
  // row — the old effect's setBaseline(fromServer) would already loop otherwise.)
  const [reconciled, setReconciled] = useState({ isActive, inventory })
  if (reconciled.isActive !== isActive || reconciled.inventory !== inventory) {
    setReconciled({ isActive, inventory })
    if (isActive && inventory) {
      const fromServer = toInventoryForm(inventory)
      if (!inventoryFormIsDirty(form, baseline)) setForm(fromServer)
      setBaseline(fromServer)
      setUpdatedAt(inventory.updatedAt)
    }
  }

  const isDirty = useMemo(() => inventoryFormIsDirty(form, baseline), [form, baseline])

  const { updateInventory } = useInventoryListMutations()
  const isPending = updateInventory.isPending

  const commitUpdate = useCallback(
    (id: string, { onSuccess, onError }: CommitInventoryUpdateCallbacks) => {
      if (updatedAt === null) return
      updateInventory.mutate(
        { id, input: form, revisionKey: updatedAt },
        {
          onSuccess: (response) => {
            const detail = response.inventory as InventoryDetailRecord
            const detailForm = toInventoryForm(detail)
            applyServerSnapshot(detailForm, detail.updatedAt)
            onSuccess?.(detail as InventoryDetail)
          },
          onError: (err) => onError?.(err),
        },
      )
    },
    [updateInventory, form, updatedAt, applyServerSnapshot],
  )

  return {
    form,
    baseline,
    updatedAt,
    isDirty,
    setField,
    reset,
    resetToBaseline,
    hydrateFromRow,
    applyServerSnapshot,
    isPending,
    commitUpdate,
  }
}
