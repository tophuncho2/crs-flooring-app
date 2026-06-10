"use client"

import { useCallback, useMemo, useState } from "react"
import type { ContactOption } from "@builders/domain"
import { createRecordSectionError, type RecordSectionError } from "@/types/record/section-error"
import { getClientErrorMessage } from "@/transport/client-errors"
import {
  createLaborPaymentRequest,
  deleteLaborPaymentRequest,
  updateLaborPaymentRequest,
} from "@/modules/contacts/data/contact-labor-payments-mutations"
import {
  EMPTY_FORM,
  EMPTY_LOCAL,
  buildCreateForm,
  buildCreateLocal,
  buildEditForm,
  buildEditLocal,
  formIsDirty,
  isFormValid,
} from "./form"
import type {
  LaborPaymentEditForm,
  LaborPaymentEditLocal,
  LaborPaymentEditOpenSpec,
} from "./types"

/**
 * Owns the edit lifecycle for a labor payment inside the contact record view's
 * drilldown section: open/close (create|edit), editable form, dirty tracking,
 * and the create/update/delete mutations. Leaner sibling of the inventory
 * `useAdjustmentEditController` — the only relink is the editable contact
 * picker; there is no WO/WOMI resolution.
 *
 * Behavior contract (mirrors adjustments):
 *   - Save (create) → flip in place to edit the new row.
 *   - Save (edit)   → refresh form/baseline to the saved values.
 *   - Delete        → settle, then the caller routes back to the list.
 * `publish` fires after every mutation so the host refreshes the paginated list.
 */
export function useLaborPaymentEditController({
  publish,
}: {
  publish: () => void
}) {
  const [open, setOpen] = useState<LaborPaymentEditOpenSpec | null>(null)
  const [form, setForm] = useState<LaborPaymentEditForm>(EMPTY_FORM)
  const [baseline, setBaseline] = useState<LaborPaymentEditForm>(EMPTY_FORM)
  const [local, setLocal] = useState<LaborPaymentEditLocal>(EMPTY_LOCAL)
  const [error, setError] = useState<RecordSectionError | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Rebuild form/baseline/local when the open spec changes (previous-value
  // tracking during render). A mutation's same-row refresh only clears error.
  const [trackedOpen, setTrackedOpen] = useState(open)
  if (trackedOpen !== open) {
    const isSameRowRefresh =
      trackedOpen?.mode === "edit" &&
      open?.mode === "edit" &&
      trackedOpen.laborPayment.id === open.laborPayment.id
    setTrackedOpen(open)
    if (isSameRowRefresh) {
      setError(null)
    } else if (!open) {
      setForm(EMPTY_FORM)
      setBaseline(EMPTY_FORM)
      setLocal(EMPTY_LOCAL)
      setError(null)
    } else if (open.mode === "edit") {
      const next = buildEditForm(open.laborPayment)
      setForm(next)
      setBaseline(next)
      setLocal(buildEditLocal(open.laborPayment))
      setError(null)
    } else {
      const next = buildCreateForm(open.seed)
      setForm(next)
      setBaseline(next)
      setLocal(buildCreateLocal(open.seed))
      setError(null)
    }
  }

  const isDirty = useMemo(() => formIsDirty(form, baseline), [form, baseline])
  const canSave = useMemo(() => {
    if (!open) return false
    return open.mode === "create" ? isFormValid(form) : isFormValid(form) && isDirty
  }, [open, form, isDirty])

  const openPanel = useCallback((spec: LaborPaymentEditOpenSpec) => {
    setOpen(spec)
  }, [])

  const setField = useCallback(
    <K extends keyof LaborPaymentEditForm>(field: K, value: LaborPaymentEditForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  const selectContact = useCallback((option: ContactOption | null) => {
    setForm((prev) => ({ ...prev, contactId: option?.id ?? "" }))
    setLocal((prev) => ({ ...prev, contactLabel: option?.name ?? "" }))
    setError(null)
  }, [])

  const save = useCallback(async () => {
    if (!open || isSaving || !isFormValid(form)) return
    setIsSaving(true)
    setError(null)
    try {
      if (open.mode === "create") {
        const { laborPayment } = await createLaborPaymentRequest(form)
        setOpen({ mode: "edit", laborPayment })
        publish()
      } else {
        if (!isDirty) {
          setIsSaving(false)
          return
        }
        const { laborPayment } = await updateLaborPaymentRequest(
          open.laborPayment.id,
          form,
          open.laborPayment.updatedAt,
        )
        setOpen({ mode: "edit", laborPayment })
        publish()
      }
    } catch (err) {
      setError(
        createRecordSectionError({
          kind: "transport",
          message: getClientErrorMessage(err, "Could not save the labor payment."),
          retryable: true,
        }),
      )
    } finally {
      setIsSaving(false)
    }
  }, [open, form, isDirty, isSaving, publish])

  // Resolves once the delete commits (rejects on error, after surfacing it) so
  // the caller can sequence its back-to-list navigation off a successful settle.
  const deleteLaborPayment = useCallback(async () => {
    if (!open || open.mode !== "edit" || isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      await deleteLaborPaymentRequest(open.laborPayment.id, open.laborPayment.updatedAt)
      publish()
    } catch (err) {
      setError(
        createRecordSectionError({
          kind: "transport",
          message: getClientErrorMessage(err, "Could not delete the labor payment."),
          retryable: true,
        }),
      )
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [open, isSaving, publish])

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
    isDirty,
    canSave,
    isSaving,
    error,
    openPanel,
    close,
    discard,
    setField,
    selectContact,
    save,
    deleteLaborPayment,
  }
}

export type LaborPaymentEditController = ReturnType<typeof useLaborPaymentEditController>
