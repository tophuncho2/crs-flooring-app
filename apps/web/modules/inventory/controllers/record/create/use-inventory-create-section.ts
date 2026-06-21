"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import type { InventoryDetail } from "@builders/domain"
import type { InventoryDetailRecord } from "@builders/db"
import { useInventoryListMutations } from "@/modules/inventory/controllers/list/use-inventory-list-mutations"

/**
 * Editable draft for the manual create-inventory flow. `productId` + `warehouseId`
 * select the snapshot/relation (immutable after create); the rest are free-entry
 * fields. All start blank; the product's unit/category snapshot columns are
 * derived server-side from the picked product.
 */
export type InventoryCreateForm = {
  productId: string
  warehouseId: string
  rollNumber: string
  dyeLot: string
  note: string
  startingStock: string
  cost: string
  freight: string
  location: string
  internalNotes: string
}

const EMPTY_CREATE_FORM: InventoryCreateForm = {
  productId: "",
  warehouseId: "",
  rollNumber: "",
  dyeLot: "",
  note: "",
  startingStock: "",
  cost: "",
  freight: "",
  location: "",
  internalNotes: "",
}

export type CommitInventoryCreateCallbacks = {
  onSuccess?: (inventory: InventoryDetail) => void
  onError?: (error: unknown) => void
}

export type InventoryCreateSlice = {
  form: InventoryCreateForm
  isDirty: boolean
  /** Minimal client gate (product + warehouse + starting stock); server does full validation. */
  canSubmit: boolean
  setField: <K extends keyof InventoryCreateForm>(
    field: K,
    value: InventoryCreateForm[K],
  ) => void
  reset: () => void
  resetToSeed: () => void
  isPending: boolean
  commitCreate: (callbacks: CommitInventoryCreateCallbacks) => void
}

/**
 * Create-inventory section slice for the create page (`/dashboard/inventory/new`).
 * Owns the editable draft and the create mutation. No optimistic-lock token — a
 * create inserts a brand-new row rather than mutating an existing one.
 *
 * Opens blank for a fresh create, or pre-filled from `initialSeed` when the page
 * is seeded from a source row (the "duplicate" entry point — `?sourceId=`). The
 * seeded values become the draft's baseline, so the form opens clean (not dirty)
 * and Discard returns to the seed rather than to empty.
 */
export function useInventoryCreateSection({
  clearError,
  initialSeed,
}: {
  clearError: () => void
  initialSeed?: Partial<InventoryCreateForm>
}): InventoryCreateSlice {
  const seedForm = useMemo<InventoryCreateForm>(
    () => (initialSeed ? { ...EMPTY_CREATE_FORM, ...initialSeed } : EMPTY_CREATE_FORM),
    // The page passes a stable seed for the lifetime of the form; recompute only
    // if it identity-changes (it won't mid-edit).
    [initialSeed],
  )
  const [form, setForm] = useState<InventoryCreateForm>(seedForm)
  const [seed, setSeed] = useState<InventoryCreateForm>(seedForm)

  const reset = useCallback(() => {
    setForm(EMPTY_CREATE_FORM)
    setSeed(EMPTY_CREATE_FORM)
  }, [])

  const resetToSeed = useCallback(() => setForm(seed), [seed])

  const setField = useCallback(
    <K extends keyof InventoryCreateForm>(field: K, value: InventoryCreateForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      clearError()
    },
    [clearError],
  )

  const isDirty = useMemo(
    () =>
      form.productId !== seed.productId ||
      form.warehouseId !== seed.warehouseId ||
      form.rollNumber !== seed.rollNumber ||
      form.dyeLot !== seed.dyeLot ||
      form.note !== seed.note ||
      form.startingStock !== seed.startingStock ||
      form.cost !== seed.cost ||
      form.freight !== seed.freight ||
      form.location !== seed.location ||
      form.internalNotes !== seed.internalNotes,
    [form, seed],
  )

  const canSubmit =
    form.productId.trim().length > 0 &&
    form.warehouseId.trim().length > 0 &&
    form.startingStock.trim().length > 0

  const { createInventory } = useInventoryListMutations()
  const isPending = createInventory.isPending

  // Synchronous in-flight latch. `isPending` (react-query) flips on the next
  // render, so two clicks in one paint frame both pass the `disabled` gate and
  // fire two `.mutate()` calls — each with its own random idempotency key — and
  // the server inserts two rows. The ref short-circuits the second call in the
  // same tick. Mirrors the record-view engine controller's `savingRef`.
  const inFlightRef = useRef(false)

  const commitCreate = useCallback(
    ({ onSuccess, onError }: CommitInventoryCreateCallbacks) => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      createInventory.mutate(
        { input: form },
        {
          onSuccess: (response) => {
            inFlightRef.current = false
            const detail = response.inventory as InventoryDetailRecord
            onSuccess?.(detail as InventoryDetail)
          },
          onError: (err) => {
            inFlightRef.current = false
            onError?.(err)
          },
        },
      )
    },
    [createInventory, form],
  )

  return {
    form,
    isDirty,
    canSubmit,
    setField,
    reset,
    resetToSeed,
    isPending,
    commitCreate,
  }
}
