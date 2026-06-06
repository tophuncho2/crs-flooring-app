"use client"

import { useCallback, useMemo, useState } from "react"
import type { InventoryDetail } from "@builders/domain"
import type { InventoryDetailRecord } from "@builders/db"
import { useInventoryListMutations } from "@/modules/inventory/controllers/list/use-inventory-list-mutations"

/**
 * Editable draft for the duplicate-inventory flow — the five fields the user
 * can change. All five start blank when the form opens; everything else on the
 * new row is pasted server-side from the source.
 */
export type InventoryDuplicateForm = {
  rollNumber: string
  note: string
  startingStock: string
  location: string
  internalNotes: string
}

const EMPTY_DUPLICATE_FORM: InventoryDuplicateForm = {
  rollNumber: "",
  note: "",
  startingStock: "",
  location: "",
  internalNotes: "",
}

export type CommitInventoryDuplicateCallbacks = {
  onSuccess?: (inventory: InventoryDetail) => void
  onError?: (error: unknown) => void
}

export type InventoryDuplicateSlice = {
  form: InventoryDuplicateForm
  isDirty: boolean
  /** Minimal client gate (starting stock non-empty); server does full validation. */
  canSubmit: boolean
  setField: <K extends keyof InventoryDuplicateForm>(
    field: K,
    value: InventoryDuplicateForm[K],
  ) => void
  reset: () => void
  resetToSeed: () => void
  isPending: boolean
  commitDuplicate: (sourceId: string, callbacks: CommitInventoryDuplicateCallbacks) => void
}

/**
 * Duplicate-inventory section slice for the standalone duplicate-create page
 * (`/dashboard/inventory/duplicate`). Owns the editable draft and the
 * create-from-source mutation. Unlike the
 * edit slice there's no optimistic-lock token — a duplicate inserts a brand-new
 * row rather than mutating an existing one. The draft opens blank (`reset`);
 * nothing is pre-filled from the source.
 */
export function useInventoryDuplicateSection({
  clearError,
}: {
  clearError: () => void
}): InventoryDuplicateSlice {
  const [form, setForm] = useState<InventoryDuplicateForm>(EMPTY_DUPLICATE_FORM)
  const [seed, setSeed] = useState<InventoryDuplicateForm>(EMPTY_DUPLICATE_FORM)

  const reset = useCallback(() => {
    setForm(EMPTY_DUPLICATE_FORM)
    setSeed(EMPTY_DUPLICATE_FORM)
  }, [])

  const resetToSeed = useCallback(() => setForm(seed), [seed])

  const setField = useCallback(
    <K extends keyof InventoryDuplicateForm>(field: K, value: InventoryDuplicateForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      clearError()
    },
    [clearError],
  )

  const isDirty = useMemo(
    () =>
      form.rollNumber !== seed.rollNumber ||
      form.note !== seed.note ||
      form.startingStock !== seed.startingStock ||
      form.location !== seed.location ||
      form.internalNotes !== seed.internalNotes,
    [form, seed],
  )

  const canSubmit = form.startingStock.trim().length > 0

  const { duplicateInventory } = useInventoryListMutations()
  const isPending = duplicateInventory.isPending

  const commitDuplicate = useCallback(
    (sourceId: string, { onSuccess, onError }: CommitInventoryDuplicateCallbacks) => {
      duplicateInventory.mutate(
        { sourceId, input: form },
        {
          onSuccess: (response) => {
            const detail = response.inventory as InventoryDetailRecord
            onSuccess?.(detail as InventoryDetail)
          },
          onError: (err) => onError?.(err),
        },
      )
    },
    [duplicateInventory, form],
  )

  return {
    form,
    isDirty,
    canSubmit,
    setField,
    reset,
    resetToSeed,
    isPending,
    commitDuplicate,
  }
}
