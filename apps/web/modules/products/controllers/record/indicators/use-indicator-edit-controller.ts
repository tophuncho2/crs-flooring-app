"use client"

import { useCallback, useMemo, useState } from "react"
import {
  toInventoryIndicatorUpdateForm,
  validateIndicatorUpdateForm,
  type InventoryIndicatorRow,
  type InventoryIndicatorUpdateForm,
} from "@builders/domain"
import {
  deleteIndicatorRequest,
  updateIndicatorRequest,
} from "@/modules/products/data/product-indicators-request"

const EMPTY_FORM: InventoryIndicatorUpdateForm = {
  lowStockThreshold: "",
  internalNotes: "",
  isActive: true,
}

export type IndicatorEditController = {
  /** The open indicator row (edit mode), or null while closed. */
  open: InventoryIndicatorRow | null
  form: InventoryIndicatorUpdateForm
  isDirty: boolean
  canSave: boolean
  isSaving: boolean
  error: string | null
  openEdit: (row: InventoryIndicatorRow) => void
  close: () => void
  discard: () => void
  setField: <K extends keyof InventoryIndicatorUpdateForm>(
    field: K,
    value: InventoryIndicatorUpdateForm[K],
  ) => void
  save: (opts?: { onSaved?: () => void }) => void
  deleteIndicator: () => Promise<unknown>
}

/**
 * The indicators edit state machine — the leaner sibling of the adjustment edit
 * controller. Holds one open indicator's editable subset (threshold / notes /
 * active), tracks dirtiness + OCC, and issues the PATCH / DELETE. Create is a
 * modal, so this is edit-only. `publish` is the post-mutation reconcile.
 */
export function useIndicatorEditController({
  productId,
  publish,
}: {
  productId: string
  publish: () => void
}): IndicatorEditController {
  const [open, setOpen] = useState<InventoryIndicatorRow | null>(null)
  const [baseline, setBaseline] = useState<InventoryIndicatorUpdateForm>(EMPTY_FORM)
  const [form, setForm] = useState<InventoryIndicatorUpdateForm>(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openEdit = useCallback((row: InventoryIndicatorRow) => {
    const next = toInventoryIndicatorUpdateForm(row)
    setOpen(row)
    setBaseline(next)
    setForm(next)
    setError(null)
  }, [])

  const close = useCallback(() => {
    if (isSaving) return
    setOpen(null)
    setError(null)
  }, [isSaving])

  const discard = useCallback(() => {
    setForm(baseline)
    setError(null)
  }, [baseline])

  const setField = useCallback(
    <K extends keyof InventoryIndicatorUpdateForm>(
      field: K,
      value: InventoryIndicatorUpdateForm[K],
    ) => {
      setForm((previous) => ({ ...previous, [field]: value }))
    },
    [],
  )

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(baseline),
    [form, baseline],
  )
  const canSave = useMemo(
    () => isDirty && validateIndicatorUpdateForm(form).length === 0,
    [isDirty, form],
  )

  const save = useCallback(
    (opts?: { onSaved?: () => void }) => {
      if (!open || !canSave || isSaving) return
      setIsSaving(true)
      setError(null)
      updateIndicatorRequest(
        productId,
        open.id,
        {
          lowStockThreshold: form.lowStockThreshold,
          internalNotes: form.internalNotes,
          isActive: form.isActive,
        },
        open.updatedAt,
      )
        .then((updated) => {
          const next = toInventoryIndicatorUpdateForm(updated)
          // Re-seed from the server row so the next save carries a fresh OCC token.
          setOpen(updated)
          setBaseline(next)
          setForm(next)
          publish()
          opts?.onSaved?.()
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : "Failed to save indicator.")
        })
        .finally(() => setIsSaving(false))
    },
    [open, canSave, isSaving, form, productId, publish],
  )

  const deleteIndicator = useCallback(async () => {
    if (!open) return
    setIsSaving(true)
    setError(null)
    try {
      await deleteIndicatorRequest(productId, open.id, open.updatedAt)
      publish()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete indicator.")
      throw e
    } finally {
      setIsSaving(false)
    }
  }, [open, productId, publish])

  return {
    open,
    form,
    isDirty,
    canSave,
    isSaving,
    error,
    openEdit,
    close,
    discard,
    setField,
    save,
    deleteIndicator,
  }
}
