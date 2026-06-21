"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createRecordSectionError, type RecordSectionError } from "@/types/record/section-error"
import { getClientErrorMessage } from "@/transport/client-errors"
import {
  createPaymentRequest,
  deletePaymentRequest,
  updatePaymentRequest,
} from "@/modules/payments/data/mutations"
import { EMPTY_FORM, buildEditForm, formIsDirty, isFormValid } from "./form"
import type { PaymentRecordForm, PaymentRecordOpenSpec } from "./types"

const PAYMENTS_LIST_PATH = "/dashboard/payments"
const PAYMENTS_RECORD_PATH = "/dashboard/payments/record"

/**
 * Owns the standalone payment record page: editable form, dirty tracking, and
 * the create/update/delete mutations. Create reuses ONE stable idempotency key
 * per submit intent (`createKeyRef`) across retries — the fix for the known
 * double-submit bug — and `isSaving` is the in-flight guard. Save (create) routes
 * to the new row's edit URL; Save (edit) refreshes the baseline; Delete returns
 * to the list.
 */
export function usePaymentRecordController({ initial }: { initial: PaymentRecordOpenSpec }) {
  const router = useRouter()

  const initialForm = initial.mode === "edit" ? buildEditForm(initial.payment) : EMPTY_FORM

  const [open, setOpen] = useState<PaymentRecordOpenSpec>(initial)
  const [form, setForm] = useState<PaymentRecordForm>(initialForm)
  const [baseline, setBaseline] = useState<PaymentRecordForm>(initialForm)
  const [error, setError] = useState<RecordSectionError | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // One stable key per create intent (lazy-initialized so it survives re-renders).
  const createKeyRef = useRef<string | null>(null)
  if (createKeyRef.current === null) createKeyRef.current = crypto.randomUUID()

  const isDirty = useMemo(() => formIsDirty(form, baseline), [form, baseline])
  const canSave = useMemo(() => {
    if (!isFormValid(form)) return false
    return open.mode === "create" ? true : isDirty
  }, [open.mode, form, isDirty])

  const setField = useCallback(
    <K extends keyof PaymentRecordForm>(field: K, value: PaymentRecordForm[K]) => {
      setForm((prev) => ({ ...prev, [field]: value }))
      setError(null)
    },
    [],
  )

  const discard = useCallback(() => {
    setForm(baseline)
    setError(null)
  }, [baseline])

  const save = useCallback(async () => {
    if (isSaving || !isFormValid(form)) return
    setIsSaving(true)
    setError(null)
    try {
      if (open.mode === "create") {
        const { payment } = await createPaymentRequest(form, createKeyRef.current!)
        // Fresh key for any subsequent create; flip this page into edit mode.
        createKeyRef.current = crypto.randomUUID()
        const next = buildEditForm(payment)
        setForm(next)
        setBaseline(next)
        setOpen({ mode: "edit", payment })
        router.replace(`${PAYMENTS_RECORD_PATH}?paymentId=${payment.id}`, { scroll: false })
      } else {
        if (!isDirty) {
          setIsSaving(false)
          return
        }
        const { payment } = await updatePaymentRequest(
          open.payment.id,
          form,
          open.payment.updatedAt,
        )
        const next = buildEditForm(payment)
        setForm(next)
        setBaseline(next)
        setOpen({ mode: "edit", payment })
      }
    } catch (err) {
      setError(
        createRecordSectionError({
          kind: "transport",
          message: getClientErrorMessage(err, "Could not save the payment."),
          retryable: true,
        }),
      )
    } finally {
      setIsSaving(false)
    }
  }, [open, form, isDirty, isSaving, router])

  const deletePayment = useCallback(async () => {
    if (open.mode !== "edit" || isSaving) return
    setIsSaving(true)
    setError(null)
    try {
      await deletePaymentRequest(open.payment.id, open.payment.updatedAt)
      router.push(PAYMENTS_LIST_PATH, { scroll: false })
    } catch (err) {
      setError(
        createRecordSectionError({
          kind: "transport",
          message: getClientErrorMessage(err, "Could not delete the payment."),
          retryable: true,
        }),
      )
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [open, isSaving, router])

  const backToList = useCallback(() => {
    router.push(PAYMENTS_LIST_PATH, { scroll: false })
  }, [router])

  return {
    open,
    form,
    isDirty,
    canSave,
    isSaving,
    error,
    setField,
    discard,
    save,
    deletePayment,
    backToList,
  }
}

export type PaymentRecordController = ReturnType<typeof usePaymentRecordController>
