"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { DEFAULT_PALETTE_COLOR, type PaletteColor } from "@builders/domain"
import type { InventoryAdjustmentRecord, InventoryDetailRecord } from "@builders/db"
import { useReturnCreateMutation } from "./use-return-create-mutation"

/**
 * Editable draft for the "Create Return" flow — the composite of the inventory
 * row's identity fields + the INCREASE adjustment's own facts. One `location`
 * field feeds BOTH rows; `returnedQuantity` is the adjustment quantity; the new
 * row's `startingStock` ("0") + `cost`/`freight` (null) + `internalNotes` are
 * hardcoded server-side and never entered here. `color` / `isWaste` / `area`
 * ride onto the adjustment; `workOrderId` is carried (seeded from the WO seam),
 * not surfaced as a picker.
 */
export type ReturnCreateForm = {
  productId: string
  unitId: string
  warehouseId: string
  rollNumber: string
  dyeLot: string
  note: string
  location: string
  coverageUnitId: string
  coveragePerUnit: string
  conversionFormulaId: string
  returnedQuantity: string
  area: string
  color: PaletteColor
  isWaste: boolean
  workOrderId: string | null
}

const EMPTY_RETURN_FORM: ReturnCreateForm = {
  productId: "",
  unitId: "",
  warehouseId: "",
  rollNumber: "",
  dyeLot: "",
  note: "",
  location: "",
  coverageUnitId: "",
  coveragePerUnit: "",
  conversionFormulaId: "",
  returnedQuantity: "",
  area: "",
  color: DEFAULT_PALETTE_COLOR,
  isWaste: false,
  workOrderId: null,
}

export type ReturnCreateResponse = {
  inventory: InventoryDetailRecord
  adjustment: InventoryAdjustmentRecord
}

export type CommitReturnCreateCallbacks = {
  onSuccess?: (result: ReturnCreateResponse) => void
  onError?: (error: unknown) => void
}

export type ReturnCreateSlice = {
  form: ReturnCreateForm
  isDirty: boolean
  /** Minimal client gate (product + unit + warehouse + positive quantity); server does full validation. */
  canSubmit: boolean
  setField: <K extends keyof ReturnCreateForm>(field: K, value: ReturnCreateForm[K]) => void
  resetToSeed: () => void
  isPending: boolean
  commitCreate: (callbacks: CommitReturnCreateCallbacks) => void
}

export function useReturnCreateForm({
  clearError,
  initialSeed,
}: {
  clearError: () => void
  initialSeed?: Partial<ReturnCreateForm>
}): ReturnCreateSlice {
  const seed = useMemo<ReturnCreateForm>(
    () => (initialSeed ? { ...EMPTY_RETURN_FORM, ...initialSeed } : EMPTY_RETURN_FORM),
    // The host passes a stable seed for the form's lifetime; recompute only if it
    // identity-changes (it won't mid-edit).
    [initialSeed],
  )
  const [form, setForm] = useState<ReturnCreateForm>(seed)

  const resetToSeed = useCallback(() => setForm(seed), [seed])

  const setField = useCallback(
    <K extends keyof ReturnCreateForm>(field: K, value: ReturnCreateForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      clearError()
    },
    [clearError],
  )

  const isDirty = useMemo(
    () => (Object.keys(seed) as (keyof ReturnCreateForm)[]).some((key) => form[key] !== seed[key]),
    [form, seed],
  )

  const canSubmit =
    form.productId.trim().length > 0 &&
    form.unitId.trim().length > 0 &&
    form.warehouseId.trim().length > 0 &&
    Number(form.returnedQuantity.trim()) > 0

  const { createReturn } = useReturnCreateMutation()
  const isPending = createReturn.isPending

  // Synchronous in-flight latch — react-query's isPending flips a render later,
  // so two clicks in one paint frame both pass the disabled gate. Mirrors the
  // create-inventory controller's inFlightRef.
  const inFlightRef = useRef(false)

  const commitCreate = useCallback(
    ({ onSuccess, onError }: CommitReturnCreateCallbacks) => {
      if (inFlightRef.current) return
      inFlightRef.current = true
      const { color, isWaste, workOrderId, ...rest } = form
      createReturn.mutate(
        {
          input: {
            ...rest,
            color,
            isWaste,
            ...(workOrderId ? { workOrderId } : {}),
          },
        },
        {
          onSuccess: (response) => {
            inFlightRef.current = false
            onSuccess?.(response)
          },
          onError: (err) => {
            inFlightRef.current = false
            onError?.(err)
          },
        },
      )
    },
    [createReturn, form],
  )

  return { form, isDirty, canSubmit, setField, resetToSeed, isPending, commitCreate }
}
