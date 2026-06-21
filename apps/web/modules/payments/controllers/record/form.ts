import { EMPTY_PAYMENT_FORM, toPaymentForm, validatePaymentForm, type Payment } from "@builders/domain"
import type { PaymentRecordForm } from "./types"

export const EMPTY_FORM: PaymentRecordForm = { ...EMPTY_PAYMENT_FORM }

export function buildEditForm(payment: Payment): PaymentRecordForm {
  return {
    ...toPaymentForm(payment),
    // The DateCell wants `YYYY-MM-DD`; the row carries a full ISO timestamp.
    paymentDate: payment.paymentDate ? payment.paymentDate.slice(0, 10) : "",
  }
}

export function formIsDirty(form: PaymentRecordForm, baseline: PaymentRecordForm): boolean {
  return (
    form.amount !== baseline.amount ||
    form.direction !== baseline.direction ||
    form.paymentType !== baseline.paymentType ||
    form.paymentMethod !== baseline.paymentMethod ||
    form.paymentDate !== baseline.paymentDate ||
    form.memo !== baseline.memo
  )
}

export function isFormValid(form: PaymentRecordForm): boolean {
  return validatePaymentForm(form).length === 0
}
